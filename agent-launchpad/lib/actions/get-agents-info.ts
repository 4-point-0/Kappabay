"use server";

import { prisma } from "@/lib/db";

/**
 * Fetches agent details for a given wallet address.
 * Excludes oracle-related fields and other sensitive fields.
 *
 * @param ownerWallet - The wallet address of the owner.
 * @returns An array of agents with filtered fields.
 */
export async function getAgentsByOwner(ownerWallet: string) {
	if (!ownerWallet) {
		throw new Error("Missing wallet address.");
	}
	try {
		const agents = await prisma.agent.findMany({
			where: { ownerWallet },
		});
		// Exclude oracle-related fields (and any other fields you don't wish to expose)
		return agents.map(({ hasOracle, oraclePort, oraclePid, agentWalletKey, ...agentInfo }: any) => agentInfo);
	} catch (error: any) {
		console.error("Failed to fetch agents:", error);
		throw new Error(error.message || "Failed to fetch agents.");
	}
}
