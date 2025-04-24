"use server";

import { startService, stopService } from "@/lib/actions/manage-docker-service";

/**
 * Starts the agent's service.
 */
export async function startAgent(agentId: string) {
  await startService(agentId);
}

/**
 * Stops the agent's service.
 */
export async function stopAgent(agentId: string) {
  await stopService(agentId);
}
