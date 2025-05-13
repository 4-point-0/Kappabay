"use server";

import { prisma } from "../db";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { serializeAgentConfig } from "../utils";
import { getAgentKeypair, getAdminCapId } from "./sui-utils";
import type { AgentConfig } from "../types";

export async function updateAgentConfig(agentId: string, newConfig: AgentConfig) {
  // 1) load agent + keypair
  const { keypair, address, agent } = await getAgentKeypair(agentId);

  // 2) init Sui client & derive AdminCap
  const client = new SuiClient({ url: getFullnodeUrl("testnet") });
  const adminCap = agent.adminCapId || (await getAdminCapId(client, address));

  // 3) build the Move call
  const tx = new Transaction();
  const bytes = Array.from(Buffer.from(serializeAgentConfig(newConfig)));
  tx.moveCall({
    target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::update_configuration`,
    arguments: [
      tx.object(agent.objectId),
      tx.object(adminCap),
      tx.pure(bcs.vector(bcs.u8()).serialize(bytes)),
    ],
  });

  // 4) sign & execute on‐chain
  await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    requestType: "WaitForLocalExecution",
  });

  // 5) persist new config in Prisma
  await prisma.agent.update({
    where: { id: agentId },
    data: { config: newConfig },
  });
}
