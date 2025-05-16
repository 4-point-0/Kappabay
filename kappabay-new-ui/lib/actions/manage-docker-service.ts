// app/lib/actions/manage-docker-service.ts
"use server";

import fs from "fs";
import path from "path";
import util from "util";
import { pipeline } from "stream";
import { promisify } from "util";
import { prisma } from "../db";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import { uploadBlob, retrieveBlob } from "@/lib/walrus-api";
import { Agent } from "https";
import axios from "axios";

const exec = util.promisify(require("child_process").exec);
const DB_CACHE_DIR = path.join(process.cwd(), "db-cache");

const streamPipeline = promisify(pipeline);

const PORTAINER_URL = process.env.PORTAINER_URL!; // e.g., http://localhost:9000/api
const PORTAINER_API_KEY = process.env.PORTAINER_API_KEY!;
const PORTAINER_ENDPOINT_ID = process.env.PORTAINER_ENDPOINT_ID!; // e.g., '1'

// Ensure DB_CACHE_DIR exists
if (!fs.existsSync(DB_CACHE_DIR)) {
	fs.mkdirSync(DB_CACHE_DIR, { recursive: true });
}

async function portainerFetch(path: string, options: any = {}) {
	console.log("path", path);

	// Create a clean config to prevent option overrides
	const config = {
		method: options.method || "GET",
		url: `${PORTAINER_URL}${path}`,
		headers: {
			"X-API-Key": PORTAINER_API_KEY,
		},
		httpsAgent: new Agent({ rejectUnauthorized: false }),
	};

	// Carefully merge headers, ensuring API key isn't overwritten
	if (options.headers) {
		config.headers = {
			...config.headers,
			...options.headers,
		};
	}

	// Add any other options, but don't let them override critical properties
	delete options.headers;
	delete options.method;
	delete options.url;

	const finalConfig = {
		...config,
		...options,
	};

	try {
		console.log("Request URL:", finalConfig.url);
		console.log("Request method:", finalConfig.method);
		console.log("Content-Type:", finalConfig.headers["Content-Type"] || "not set");

		const response = await axios(finalConfig);
		return response;
	} catch (error: any) {
		console.error(`Portainer API error: ${error.message}`);
		console.error(`Status: ${error.response?.status}`);
		console.error(`Response data:`, error.response?.data);
		throw error;
	}
}

async function getContainerId(name: string): Promise<string> {
	const response = await portainerFetch(`/api/endpoints/${PORTAINER_ENDPOINT_ID}/docker/containers/json?all=1`);
	const containers = response.data;
	console.log("name", name);

	const match = containers.find((c: any) => {
		console.log("c.Names", c.Names);
		return c.Names?.some((n: string) => n.includes(name));
	});

	if (!match) throw new Error(`Container with name ${name} not found.`);
	return match.Id;
}

async function downloadDbFromContainer(containerId: string, containerPath: string, localPath: string) {
	const response = await portainerFetch(
		`/api/endpoints/${PORTAINER_ENDPOINT_ID}/docker/containers/${containerId}/archive?path=${encodeURIComponent(
			containerPath
		)}`,
		{ responseType: "stream" } // Enable streaming for binary data
	);

	if (!response.data) throw new Error("No response body from Portainer");

	const fileStream = fs.createWriteStream(localPath);
	await streamPipeline(response.data, fileStream);
}

async function createTarArchive(sourcePath: string, targetDir: string): Promise<string> {
	try {
		const tarFilename = `${path.basename(sourcePath)}.tar`;
		const tarPath = path.join(targetDir, tarFilename);

		console.log(`Creating tar archive from ${sourcePath} to ${tarPath}`);

		// Get the base filename without path
		const baseFilename = path.basename(sourcePath);
		// Get the directory where the source file is located
		const sourceDir = path.dirname(sourcePath);

		// Run tar command to create the archive
		await exec(`tar -cvf "${tarPath}" -C "${sourceDir}" "${baseFilename}"`);

		// Verify the tar file was created
		if (!fs.existsSync(tarPath)) {
			throw new Error(`Failed to create tar archive at ${tarPath}`);
		}

		// Log tar file info
		const stats = fs.statSync(tarPath);
		console.log(`Tar file created: ${tarPath} (${stats.size} bytes)`);

		// Verify the tar file contents (debug purpose)
		const { stdout } = await exec(`tar -tvf "${tarPath}"`);
		console.log(`Tar contents: ${stdout}`);

		return tarPath;
	} catch (error: any) {
		console.error(`Error creating tar archive: ${error.message}`);
		throw error;
	}
}

async function uploadDbToContainer(containerId: string, containerPath: string, localPath: string) {
	try {
		// Create a temporary directory for the tar file
		const tmpDir = path.join(DB_CACHE_DIR, "tmp");
		if (!fs.existsSync(tmpDir)) {
			fs.mkdirSync(tmpDir, { recursive: true });
		}

		// Create tar archive of the SQLite file
		const tarPath = await createTarArchive(localPath, tmpDir);
		console.log(`Created tar archive at ${tarPath}`);

		// Read the tar file into a buffer
		const fileBuffer = fs.readFileSync(tarPath);

		// Extract the directory part of the containerPath
		const containerDir = path.dirname(containerPath);

		console.log("Attempting to upload to container:", containerId);
		console.log("Container path:", containerDir);
		console.log("Tar file size:", fileBuffer.length, "bytes");

		// Use the Docker Engine API directly instead of Portainer's API wrapper
		// Docker Engine expects application/x-tar for this endpoint
		const uploadPath = `/api/endpoints/${PORTAINER_ENDPOINT_ID}/docker/containers/${containerId}/archive?path=${encodeURIComponent(
			containerDir
		)}`;

		const response = await portainerFetch(uploadPath, {
			method: "PUT",
			data: fileBuffer,
			headers: {
				"Content-Type": "application/x-tar",
			},
			// Disable any transformations of the data
			transformRequest: [(data: any) => data],
		});

		console.log("Upload response:", response.status);

		// Clean up the tar file
		fs.unlinkSync(tarPath);

		return true;
	} catch (error: any) {
		console.error("Error uploading to container:", error.message);
		if (error.response) {
			console.error("Response status:", error.response.status);
			console.error("Response data:", error.response.data);
		}
		throw error;
	}
}

async function getAgent(agentId: string) {
	const agent = await prisma.agent.findFirst({
		where: { id: agentId },
		select: {
			id: true,
			dockerServiceId: true,
			latestBlobHash: true,
			port: true,
			terminalPort: true,
			publicAgentUrl: true,
		},
	});
	if (!agent) throw new Error(`Agent ${agentId} not found.`);
	return agent;
}

export async function stopService(agentId: string, message: string, signature: string, address: string) {
	try {
		await verifyPersonalMessageSignature(Buffer.from(message, "utf8"), signature, { address });
		const agent = await getAgent(agentId);

		const containerName = `agent-${agent.id}`;
		const containerId = await getContainerId(containerName);
		const localDbPath = path.join(DB_CACHE_DIR, `db-${agentId}.sqlite`);
		const containerDbPath = "/app/eliza-kappabay-agent/agent/data/db.sqlite";

		await downloadDbFromContainer(containerId, containerDbPath, localDbPath);

		if (fs.existsSync(localDbPath)) {
			const fileBuffer = fs.readFileSync(localDbPath);
			const blobHash = await uploadBlob(fileBuffer);
			await prisma.agent.update({ where: { id: agentId }, data: { latestBlobHash: blobHash } });
		}

		await exec(`docker service update --replicas 0 ${agent.dockerServiceId}`);
		await prisma.agent.update({ where: { id: agentId }, data: { status: "INACTIVE", publicAgentUrl: null } });
	} catch (error) {
		console.error(`🚨 stopService failed for agent ${agentId}:`, error);
		throw error;
	}
}

export async function startService(agentId: string, message: string, signature: string, address: string) {
	try {
		await verifyPersonalMessageSignature(Buffer.from(message, "utf8"), signature, { address });
		const agent = await getAgent(agentId);

		const containerName = `agent-${agent.id}`;
		const localDbPath = path.join(DB_CACHE_DIR, `db-${agentId}.sqlite`);
		const containerDbPath = "/app/eliza-kappabay-agent/agent/data/db.sqlite";
		console.log("localDbPath", localDbPath);

		// Create DB_CACHE_DIR if it doesn't exist
		if (!fs.existsSync(DB_CACHE_DIR)) {
			fs.mkdirSync(DB_CACHE_DIR, { recursive: true });
		}

		if (!fs.existsSync(localDbPath) && agent.latestBlobHash) {
			const fileBuffer = await retrieveBlob(agent.latestBlobHash);
			fs.writeFileSync(localDbPath, fileBuffer);
		}

		await exec(`docker service update --replicas 1 ${agent.dockerServiceId}`);
		await prisma.agent.update({
			where: { id: agentId },
			data: { status: "ACTIVE" },
		});

		// Wait for container to start
		await new Promise((r) => setTimeout(r, 5000));

		const containerId = await getContainerId(containerName);

		if (fs.existsSync(localDbPath)) {
			await uploadDbToContainer(containerId, containerDbPath, localDbPath);

			// Wait a moment before executing the command
			await new Promise((r) => setTimeout(r, 2000));

			await exec(
				`docker exec -d ${containerId} sh -c "cd /app/eliza-kappabay-agent && exec pnpm start --characters=characters/agent.json"`
			);
		}

		await new Promise((r) => setTimeout(r, 5000));
		const logs = await exec(`docker service logs agent-${agentId}`);
		const match = logs.stdout.match(/https:\/\/[\w.-]+\.trycloudflare\.com/);
		const url = match?.[0] ?? null;

		await prisma.agent.update({
			where: { id: agentId },
			data: { status: "ACTIVE", publicAgentUrl: url },
		});
	} catch (error) {
		console.error(`🚨 startService failed for agent ${agentId}:`, error);
		throw error;
	}
}
