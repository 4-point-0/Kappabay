"use server";

import { prisma } from "@/lib/db";
import type { Agent } from "@prisma/client";

export async function getAgentInfo(agentId?: string, objectId?: string): Promise<Omit<Agent, "agentWalletKey"> | null> {
	try {
		// Get agent details from database using the agent's id
		const agent = await prisma.agent.findUnique({
			where: { id: agentId, objectId: objectId },
			omit: { agentWalletKey: true },
		});

		if (!agent) {
			return null;
		}

		return agent;
	} catch (error) {
		console.error("Failed to get agent info:", error);
		return null;
	}
}
