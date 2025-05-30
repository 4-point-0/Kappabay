"use server";

import { getAgentKeypair, getAdminCapId } from "./sui-utils";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { prisma } from "@/lib/db";
import { deleteBlob, uploadTextBlob } from "../walrus-api";

export async function updateKnowledgeBank(
	agentId: string,
	combinedText: string,
	sponsorAddress: string
): Promise<{
	presignedTxBytes: Uint8Array;
	agentSignature: string;
	agentAddress: string;
	adminCapId: string;
	objectId: string;
}> {
	// 1) load agent keypair & address
	const {
		keypair,
		address: agentAddress,
		agent: { objectId },
	} = await getAgentKeypair(agentId);

	// 2) derive adminCap
	const client = new SuiClient({ url: getFullnodeUrl("testnet") });
	const adminCapId = await getAdminCapId(client, agentAddress);

	// 3) build the Move call
	const tx = new Transaction();
	const bytes = new TextEncoder().encode(combinedText);
	tx.moveCall({
		target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::update_knowledgebank`,
		arguments: [tx.object(objectId), tx.object(adminCapId), tx.pure(bcs.vector(bcs.u8()).serialize(bytes))],
	});

	// 4) set sender = agent, gasOwner = agent (we’ll reassign gasOwner on client)
	tx.setSender(agentAddress);
	tx.setGasOwner(sponsorAddress);

	// 5) build & agent-sign
	const built = await tx.build({ client });
	const sig = await keypair.signTransaction(built);

	return {
		presignedTxBytes: built,
		agentSignature: sig.signature,
		agentAddress,
		adminCapId,
		objectId,
	};
}

/**
 * Persist the current Walrus blobId in Prisma
 */
export async function persistKnowledgeBlob(agentId: string, blobId: string | null) {
	return prisma.agent.update({
		where: { id: agentId },
		data: { knowledgeBlobId: blobId },
	});
}

export async function updateKnowledgeBlobWalrus(combined: string): Promise<string> {
	const buffer = Buffer.from(combined, "utf-8");
	return uploadTextBlob(buffer);
}

export async function deleteKnowledgeBlobWalrus(blobId: string): Promise<void> {
	return deleteBlob(blobId);
}
