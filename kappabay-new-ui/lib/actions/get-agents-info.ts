"use server";

import { prisma } from "@/lib/db";

/**
 * Fetches agent details for a given wallet address.
 * Excludes oracle-related fields and other sensitive fields.
 *
 * @param ownerWallet - The wallet address of the owner.
 * @returns An array of agents with filtered fields.
 */
export async function getAgentsByOwner(capId: string) {
	if (!capId) {
		throw new Error("Missing capability ID.");
	}
	try {
		const agents = await prisma.agent.findMany({
			where: { capId },
		});
		// Exclude oracle-related (and other sensitive) fields
		return agents.map(
			({ hasOracle, oraclePort, oraclePid, agentWalletKey, ...agentInfo }: any) =>
				agentInfo
		);
	} catch (error: any) {
		console.error("Failed to fetch agents:", error);
		throw new Error(error.message || "Failed to fetch agents.");
	}
}
