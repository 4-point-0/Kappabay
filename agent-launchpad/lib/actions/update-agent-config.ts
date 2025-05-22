"use server";

import { prisma } from "../db";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { serializeAgentConfig } from "../utils";
import { getAgentKeypair, getAdminCapId } from "./sui-utils";
import type { AgentConfig } from "../types";

// shape returned to client so it can sponsor & execute
export type PreparedConfigTx = {
  presignedTxBytes: Uint8Array;
  agentSignature: string;
  agentAddress: string;
  adminCapId: string;
  agentObjectId: string;
};

// 1) build & agent‐sign only (no submit, no prisma write)
export async function updateAgentConfig(
  agentId: string,
  newConfig: AgentConfig,
  sponsorAddress: string
): Promise<PreparedConfigTx> {
  const { keypair, address: agentAddress, agent } = await getAgentKeypair(agentId);
  const client = new SuiClient({ url: getFullnodeUrl("testnet") });
  const adminCapId = await getAdminCapId(client, agentAddress);

  const tx = new Transaction();
  const raw = Array.from(Buffer.from(serializeAgentConfig(newConfig)));
  tx.moveCall({
    target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::update_configuration`,
    arguments: [
      tx.object(agent.objectId),
      tx.object(adminCapId),
      tx.pure(bcs.vector(bcs.u8()).serialize(raw)),
    ],
  });
  // sponsor pattern: sender=agent, gasOwner=front‐end
  tx.setSender(agentAddress);
  tx.setGasOwner(sponsorAddress);

  const presignedTxBytes = await tx.build({ client });
  const { signature } = await keypair.signTransaction(presignedTxBytes);

  return {
    presignedTxBytes,
    agentSignature: signature,
    agentAddress,
    adminCapId,
    agentObjectId: agent.objectId,
  };
}

// 2) call *after* on‐chain success to persist config JSON
export async function persistAgentConfig(agentId: string, newConfig: AgentConfig) {
  await prisma.agent.update({
    where: { id: agentId },
    data: { config: newConfig as any },
  });
}
