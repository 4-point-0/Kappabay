"use server";

import { prisma } from "@/lib/db";

/**
 * Fetches agent details for a given wallet address.
 * Excludes oracle-related fields and other sensitive fields.
 *
 * @param ownerWallet - The wallet address of the owner.
 * @returns An array of agents with filtered fields.
 */
export async function getAgentsByCapIds(capIds: string[]) {
	if (!capIds || capIds.length === 0) {
		return [];
	}
	try {
		const agents = await prisma.agent.findMany({
			where: { capId: { in: capIds } },
		});
		// Exclude oracle-related (and other sensitive) fields
		return agents.map(({ hasOracle, oraclePort, oraclePid, agentWalletKey, ...agentInfo }: any) => agentInfo);
	} catch (error: any) {
		console.error("Failed to fetch agents:", error);
		throw new Error(error.message || "Failed to fetch agents.");
	}
}
