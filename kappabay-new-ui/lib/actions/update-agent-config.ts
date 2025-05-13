"use server";

import { prisma } from "../db";

export async function updateAgentConfig(agentId: string, config: string) {
	await prisma.agent.update({
		where: { id: agentId },
		data: { config },
	});
}
