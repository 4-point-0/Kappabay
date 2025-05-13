"use server";

import { prisma } from "../db";

export async function updateAgentConfig(
  agentId: string,
  config: unknown
) {
  await prisma.agent.update({
    where: { id: agentId },
    data: { config },
  });
}
