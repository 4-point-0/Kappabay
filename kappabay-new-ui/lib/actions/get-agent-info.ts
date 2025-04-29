"use server";

import { prisma } from "@/lib/db";

export async function getAgentInfo(agentId: string) {
	try {
		// Get agent details from database using the agent's id
		const agent = await prisma.agent.findUnique({
			where: { id: agentId },
		});

		if (!agent) {
			return null;
		}

		// For example, remove the agentWalletKey if needed; leave 'port' intact.
		const { agentWalletKey, ...agentInfo } = agent;
		return agentInfo;
	} catch (error) {
		console.error("Failed to get agent info:", error);
		return null;
	}
}
