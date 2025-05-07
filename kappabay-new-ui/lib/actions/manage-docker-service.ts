"use server";

import { exec } from "child_process";
import util from "util";
import fs from "fs";
import path from "path";
import { uploadBlob, retrieveBlob } from "@/lib/walrus-api";
import { prisma } from "../db";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import ngrok from "ngrok";

const execAsync = util.promisify(exec);

const DB_CACHE_DIR = path.join(process.cwd(), "db-cache");

/**
 * Retrieves the agentId using the serviceId.
 * @param serviceId - The Docker service ID.
 * @returns The corresponding agentId.
 * @throws Will throw an error if the agent is not found.
 */
// now also pulling port & ngrokUrl so we can reconnect / disconnect
type AgentRecord = {
  id: string;
  dockerServiceId: string;
  latestBlobHash: string;
  port: number;
  ngrokUrl?: string;
};

async function getAgent(agentId: string): Promise<AgentRecord> {
  const agent = await prisma.agent.findFirst({
    where: { id: agentId },
    select: {
      id: true,
      dockerServiceId: true,
      latestBlobHash: true,
      port: true,
      ngrokUrl: true,
    },
  });

  if (!agent) {
    throw new Error(`Agent with id ${agentId} not found.`);
  }

  return {
    id: agent.id,
    dockerServiceId: agent.dockerServiceId ?? "",
    latestBlobHash: agent.latestBlobHash ?? "",
    port: agent.port,
    ngrokUrl: agent.ngrokUrl ?? undefined,
  };
}

/**
 * @param agentId - The id of the agent whose Docker service should be stopped.
 * @throws Will throw an error if the Docker command fails.
 */
export async function stopService(agentId: string, message: string, signature: string, address: string): Promise<void> {
	// --- AUTHENTICATION ---
	const msgBytes = Buffer.from(message, "utf8");
	// verifyPersonalMessageSignature will throw if the signature is bad or
	// if it doesn’t recover the supplied address
	await verifyPersonalMessageSignature(msgBytes, signature, { address });
	// ----------------------
	try {
		const agent = await getAgent(agentId);
		const localDbPath = path.join(DB_CACHE_DIR, `db-${agentId}.sqlite`);
		const containerDbPath = "/app/eliza-kappabay-agent/agent/data/db.sqlite";

		// Get the container ID from the service name using agent.dockerServiceId
		const { stdout: containerId } = await execAsync(`docker ps --filter "name=agent-${agent.id}" --format "{{.ID}}"`);
		if (!containerId) {
			throw new Error(`No container found for agent id ${agentId} (docker service ${agent.dockerServiceId})`);
		}

		// Export DB from container
		const exportCommand = `docker cp ${containerId.trim()}:${containerDbPath} ${localDbPath}`;

		await execAsync(exportCommand);
		console.log(`Database exported to ${localDbPath}.`);

		// If export file already exists, delete and overwrite
		if (fs.existsSync(localDbPath)) {
			fs.unlinkSync(localDbPath);
			// Re-export after deletion
			await execAsync(exportCommand);
			console.log(`Existing database at ${localDbPath} replaced.`);
		} else {
			// First-time export
			await execAsync(exportCommand);
			console.log(`Database exported to ${localDbPath}.`);
		}

		try {
			const fileBuffer = fs.readFileSync(localDbPath);
			const blobHash = await uploadBlob(fileBuffer);
			console.log(`SQLite file uploaded to Walrus publisher with blob id: ${blobHash}`);

			// Update the agent with the latest blob hash so we can retrieve it later.
			await prisma.agent.update({
				where: { id: agentId },
				data: { latestBlobHash: blobHash },
			});
		} catch (error) {
			console.warn(`Optional blob upload failed for agent ${agentId}:`, error);
		}
		// ---- End: Optional blob upload section ----
		const command = `docker service update --replicas 0 ${agent.dockerServiceId}`;
		const { stdout, stderr } = await execAsync(command);

		if (stderr) {
			console.error(`Error stopping service ${agent.dockerServiceId}:`, stderr);
			throw new Error(stderr);
		}

		console.log(`Service ${agent.dockerServiceId} stopped successfully.`);

		// Update agent status to INACTIVE in the Prisma DB.
		await prisma.agent.update({
			where: { id: agentId },
			data: { status: "INACTIVE" },
		});

		// close any existing ngrok tunnel and clear it
		if (agent.ngrokUrl) {
			try {
				await ngrok.disconnect(agent.ngrokUrl);
				console.log(`ngrok tunnel closed: ${agent.ngrokUrl}`);
				await prisma.agent.update({
					where: { id: agentId },
					data: { ngrokUrl: null },
				});
			} catch (err) {
				console.warn(`ngrok disconnect failed for ${agentId}:`, err);
			}
		}
	} catch (error) {
		console.error(`Failed to stop service for agent id ${agentId}:`, error);
		throw error;
	}
}

/**
 * Starts a Docker Swarm service by setting its replicas to 1.
 * @param agentId - The id of the agent whose Docker service should be started.
 * @throws Will throw an error if the Docker command fails.
 */
export async function startService(
	agentId: string,
	message: string,
	signature: string,
	address: string
): Promise<void> {
	// --- AUTHENTICATION ---
	const msgBytes = Buffer.from(message, "utf8");
	// throws if invalid or signer≠address
	await verifyPersonalMessageSignature(msgBytes, signature, { address });
	// ----------------------
	try {
		const agent = await getAgent(agentId);
		const localDbPath = path.join(DB_CACHE_DIR, `db-${agentId}.sqlite`);
		const containerDbPath = "/app/eliza-kappabay-agent/agent/data/db.sqlite";

		if (!fs.existsSync(localDbPath)) {
			if (agent.latestBlobHash) {
				try {
					const fileBuffer = await retrieveBlob(agent.latestBlobHash);
					fs.writeFileSync(localDbPath, fileBuffer);
					console.log(`Local DB file downloaded from Walrus aggregator using blob id: ${agent.latestBlobHash}`);
				} catch (error) {
					console.warn(`Optional blob retrieval failed for agent ${agentId}:`, error);
				}
			} else {
				console.warn(`No local DB file and no blob hash available for agent ${agentId}. Continuing without DB import.`);
			}
		}

		// Start the service using agent.dockerServiceId
		const command = `docker service update --replicas 1 ${agent.dockerServiceId}`;
		const { stdout, stderr } = await execAsync(command);

		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Get the container ID from the service using agent.dockerServiceId
		const { stdout: containerId } = await execAsync(`docker ps --filter "name=agent-${agent.id}" --format "{{.ID}}"`);
		if (!containerId) {
			throw new Error(`No container found for agent id ${agentId} (docker service ${agent.dockerServiceId})`);
		}

		const trimmedContainerId = containerId.trim();

		if (fs.existsSync(localDbPath)) {
			// Check if PID 105 exists and is running using /proc/105/comm - agent framework
			let pidExists = false;
			const maxAttempts = 10;
			const checkInterval = 1000; // 1 second between checks

			for (let attempt = 0; attempt < maxAttempts; attempt++) {
				try {
					// Check if process exists using /proc
					const { stdout: comm } = await execAsync(`docker exec ${trimmedContainerId} cat /proc/105/comm`);
					if (comm.trim().length > 0) {
						pidExists = true;
						console.log(`Process with PID 105 found in container ${trimmedContainerId} (command: ${comm.trim()})`);
						break;
					}
				} catch (error) {
					// Ignore errors as they likely mean the process doesn't exist
				}

				if (attempt < maxAttempts - 1) {
					console.log(`Waiting for process with PID 105 to start (attempt ${attempt + 1}/${maxAttempts})`);
					await new Promise((resolve) => setTimeout(resolve, checkInterval));
				}
			}

			if (pidExists) {
				// Stop the running process with PID 105 in the container
				try {
					await execAsync(`docker exec ${trimmedContainerId} sh -c "kill -15 105"`);
					console.log(`Sent SIGTERM to process with PID 105 in container ${trimmedContainerId}`);

					// Wait for process to exit by checking /proc/105/comm
					for (let attempt = 0; attempt < maxAttempts; attempt++) {
						try {
							const { stdout: comm } = await execAsync(`docker exec ${trimmedContainerId} cat /proc/105/comm`);
							if (!comm.trim().includes("No such file or directory")) {
								console.log(`Process with PID 105 still running, waiting... (attempt ${attempt + 1}/${maxAttempts})`);
								await new Promise((resolve) => setTimeout(resolve, checkInterval));
							} else {
								console.log(`Process with PID 105 has stopped`);
								break;
							}
						} catch (error) {
							console.log(`Process with PID 105 has stopped`);
							break;
						}
					}
				} catch (error) {
					console.warn(`Failed to stop process with PID 105:`, error);
				}
			} else {
				console.warn(`Process with PID 105 not found in container ${trimmedContainerId}, proceeding without stopping`);
			}

			// Remove any existing DB file in the container
			const removeCommand = `docker exec ${trimmedContainerId} rm -f ${containerDbPath}`;
			await execAsync(removeCommand);
			console.log(`Existing database in container ${trimmedContainerId} removed.`);

			// Copy the updated DB file from the host to the container
			const importCommand = `docker cp ${localDbPath} ${trimmedContainerId}:${containerDbPath}`;
			await execAsync(importCommand);
			console.log(`Database imported to container ${trimmedContainerId} from ${localDbPath}.`);

			// Start the agent process in the container
			const startCommand = `docker exec -d ${trimmedContainerId} sh -c "cd /app/eliza-kappabay-agent && exec pnpm start --characters=characters/agent.json"`;
			await execAsync(startCommand);
			console.log(`Started agent process in container ${trimmedContainerId}`);
		} else {
			console.warn(`Local DB file ${localDbPath} not found. Skipping DB import.`);
		}

		if (stderr) {
			console.error(`Error starting service ${agent.dockerServiceId}:`, stderr);
			throw new Error(stderr);
		}

		console.log(`Service ${agent.dockerServiceId} started successfully.`);

		// Update agent status to ACTIVE in the Prisma DB.
		await prisma.agent.update({
			where: { id: agentId },
			data: { status: "ACTIVE" },
		});

		// re-open ngrok on the same port
		try {
			const publicUrl = await ngrok.connect({
				proto: "http",
				addr: agent.port,
				authtoken: process.env.NGROK_AUTH_TOKEN,
			});
			console.log(`ngrok re-established: ${publicUrl}`);
			await prisma.agent.update({
				where: { id: agentId },
				data: { ngrokUrl: publicUrl },
			});
		} catch (err) {
			console.warn(`ngrok reconnect failed for ${agentId}:`, err);
		}
	} catch (error) {
		console.error(`Failed to start service for agent id ${agentId}:`, error);
		throw error;
	}
}
