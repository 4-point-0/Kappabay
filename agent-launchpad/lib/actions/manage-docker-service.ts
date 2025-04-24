import { exec } from "child_process";
import util from "util";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const execAsync = util.promisify(exec);

const prisma = new PrismaClient();

/**
const DB_CACHE_DIR = path.join(__dirname, "../../db-cache");

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
async function getAgentId(serviceId: string): Promise<string> {
  const agent = await prisma.agent.findUnique({
    where: { dockerServiceId: serviceId },
  });

  if (!agent) {
    throw new Error(`Agent with serviceId ${serviceId} not found.`);
  }

  return agent.id;
}

/**
 * @param serviceId - The ID or name of the Docker service to stop.
 * @throws Will throw an error if the Docker command fails.
 */
export async function stopService(serviceId: string): Promise<void> {
	try {
		const agentId = await getAgentId(serviceId);
		const localDbPath = path.join(DB_CACHE_DIR, `db-${agentId}.sqlite`);
		const containerDbPath = "/app/eliza-kappabay-agent/agent/data/db.sqlite";

		// Export DB from container
		const exportCommand = `docker cp ${serviceId}:${containerDbPath} ${localDbPath}`;
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

		// Proceed to stop the service
		const command = `docker service update --replicas 0 ${serviceId}`;
		const { stdout, stderr } = await execAsync(command);

		if (stderr) {
			console.error(`Error stopping service ${serviceId}:`, stderr);
			throw new Error(stderr);
		}

		console.log(`Service ${serviceId} stopped successfully.`);
	} catch (error) {
		console.error(`Failed to stop service ${serviceId}:`, error);
		throw error;
	}
}

/**
 * Starts a Docker Swarm service by setting its replicas to 1.
 * @param serviceId - The ID or name of the Docker service to start.
 * @throws Will throw an error if the Docker command fails.
 */
export async function startService(serviceId: string): Promise<void> {
	try {
		const agentId = await getAgentId(serviceId);
		const localDbPath = path.join(DB_CACHE_DIR, `db-${agentId}.sqlite`);
		const containerDbPath = "/app/eliza-kappabay-agent/agent/data/db.sqlite";

		// Validate the existence of the local DB file
		if (!fs.existsSync(localDbPath)) {
			throw new Error(`Local DB file ${localDbPath} does not exist.`);
		}

		// If a DB already exists in the container, remove it
		const removeCommand = `docker exec ${serviceId} rm -f ${containerDbPath}`;
		await execAsync(removeCommand);
		console.log(`Existing database in container ${serviceId} removed.`);

		// Import DB to container
		const importCommand = `docker cp ${localDbPath} ${serviceId}:${containerDbPath}`;
		await execAsync(importCommand);
		console.log(`Database imported to container ${serviceId} from ${localDbPath}.`);

		// Start the service
		const command = `docker service update --replicas 1 ${serviceId}`;
		const { stdout, stderr } = await execAsync(command);

		if (stderr) {
			console.error(`Error starting service ${serviceId}:`, stderr);
			throw new Error(stderr);
		}

		console.log(`Service ${serviceId} started successfully.`);
	} catch (error) {
		console.error(`Failed to start service ${serviceId}:`, error);
		throw error;
	}
}
