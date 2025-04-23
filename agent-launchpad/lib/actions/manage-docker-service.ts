import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

/**
 * Stops a Docker Swarm service by setting its replicas to 0.
 * @param serviceId - The ID or name of the Docker service to stop.
 * @throws Will throw an error if the Docker command fails.
 */
export async function stopService(serviceId: string): Promise<void> {
	try {
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
