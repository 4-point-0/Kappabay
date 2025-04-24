"use server";

import { exec } from "child_process";
import util from "util";
import fs from "fs";
import path from "path";
import { prisma } from "../db";

const execAsync = util.promisify(exec);

const DB_CACHE_DIR = path.join(process.cwd(), "db-cache");

// Ensure the db-cache directory exists
if (!fs.existsSync(DB_CACHE_DIR)) {
	fs.mkdirSync(DB_CACHE_DIR, { recursive: true });
}

/**
 * Retrieves the agentId using the serviceId.
 * @param serviceId - The Docker service ID.
 * @returns The corresponding agentId.
 * @throws Will throw an error if the agent is not found.
 */
type AgentRecord = { id: string; dockerServiceId: string };

async function getAgent(agentId: string): Promise<AgentRecord> {
	const agent = await prisma.agent.findUnique({
		where: { id: agentId },
	});

	if (!agent) {
		throw new Error(`Agent with id ${agentId} not found.`);
	}

	return { id: agent.id, dockerServiceId: agent.dockerServiceId ?? "" };
}

/**
 * @param agentId - The id of the agent whose Docker service should be stopped.
 * @throws Will throw an error if the Docker command fails.
 */
export async function stopService(agentId: string): Promise<void> {
	console.log("agentId", agentId);

	try {
		const agent = await getAgent(agentId);
		const localDbPath = path.join(DB_CACHE_DIR, `db-${agentId}.sqlite`);
		const containerDbPath = "/app/eliza-kappabay-agent/agent/data/db.sqlite";

		console.log("DB_CACHE_DIR", DB_CACHE_DIR);
		console.log("LOCAL", localDbPath);
		console.log("DIRNAME", __dirname);
		console.log("process.cwd() ", process.cwd());

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

		// Proceed to stop the service using agent.dockerServiceId
		const command = `docker service update --replicas 0 ${agent.dockerServiceId}`;
		const { stdout, stderr } = await execAsync(command);

		if (stderr) {
			console.error(`Error stopping service ${agent.dockerServiceId}:`, stderr);
			throw new Error(stderr);
		}

		console.log(`Service ${agent.dockerServiceId} stopped successfully.`);
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
export async function startService(agentId: string): Promise<void> {
	try {
		const agent = await getAgent(agentId);
		const localDbPath = path.join(DB_CACHE_DIR, `db-${agentId}.sqlite`);
		const containerDbPath = "/app/eliza-kappabay-agent/agent/data/db.sqlite";

		// Validate the existence of the local DB file
		if (!fs.existsSync(localDbPath)) {
			throw new Error(`Local DB file ${localDbPath} does not exist.`);
		}

		// Start the service using agent.dockerServiceId
		const command = `docker service update --replicas 1 ${agent.dockerServiceId}`;
		const { stdout, stderr } = await execAsync(command);

		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Get the container ID from the service using agent.dockerServiceId
		const { stdout: containerId } = await execAsync(`docker ps --filter "name=agent-${agent.id}" --format "{{.ID}}`);
		if (!containerId) {
			throw new Error(`No container found for agent id ${agentId} (docker service ${agent.dockerServiceId})`);
		}

		// If a DB already exists in the container, remove it
		const removeCommand = `docker exec ${containerId.trim()} rm -f ${containerDbPath}`;
		await execAsync(removeCommand);
		console.log(`Existing database in container ${containerId.trim()} removed.`);

		// Import DB to container
		const importCommand = `docker cp ${localDbPath} ${containerId.trim()}:${containerDbPath}`;
		await execAsync(importCommand);
		console.log(`Database imported to container ${containerId.trim()} from ${localDbPath}.`);

		if (stderr) {
			console.error(`Error starting service ${agent.dockerServiceId}:`, stderr);
			throw new Error(stderr);
		}

		console.log(`Service ${agent.dockerServiceId} started successfully.`);
	} catch (error) {
		console.error(`Failed to start service for agent id ${agentId}:`, error);
		throw error;
	}
}
