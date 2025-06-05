"use server";

import { prisma } from "@/lib/db";
import { getAgentKeypair, getAdminCapId, getObjectFields } from "./sui-utils";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";

const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const PACKAGE_ID = process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID!;
const UPDATE_MEMORIES_FN = `${PACKAGE_ID}::agent::update_memories`;
const INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

// sponsor
const feeAddress = process.env.NEXT_PUBLIC_FEE_ADDRESS!;
const sponsorPkEnv = process.env.FEE_RECEIVER_PK!;
const sponsorKeypair = Ed25519Keypair.fromSecretKey(sponsorPkEnv);

async function collectMemoriesOnce() {
	const agents = await prisma.agent.findMany({
		where: { status: "ACTIVE" },
		select: { id: true, objectId: true, latestBlobHash: true, agentWalletKey: true },
	});

	for (const ag of agents) {
		if (!ag.agentWalletKey || !ag.objectId || !ag.latestBlobHash) continue;
		try {
			await syncAgentMemory(ag.id, ag.objectId, ag.latestBlobHash);
		} catch (e) {
			console.error(`Memory sync failed for agent ${ag.id}`, e);
		}
	}
}

async function syncAgentMemory(agentId: string, objectId: string, latestBlobHash: string) {
	console.log("in syncAgentMemory");

	// 1) fetch on-chain memory
	const fields = await getObjectFields(client, objectId);
	const raw: number[][] = (fields as any).memories;
	const flat = raw.flat();

	// decode if non‐empty, otherwise treat as “no memory on‐chain”
	let memoryBlobId: string | null = null;
	if (flat.length > 0) {
		try {
			const decoded = new TextDecoder().decode(Uint8Array.from(flat));
			memoryBlobId = JSON.parse(decoded)?.memoryBlobId ?? null;
		} catch {
			memoryBlobId = null;
		}
	}

	// if it already matches, skip
	if (memoryBlobId === latestBlobHash) return;

	// 2) prepare tx
	const { keypair, address: agentAddress } = await getAgentKeypair(agentId);
	const adminCapId = await getAdminCapId(client, agentAddress);
	const tx = new Transaction();
	// build JSON payload with memoryBlobId
	const bytes = new TextEncoder().encode(JSON.stringify({ memoryBlobId: latestBlobHash }));
	tx.moveCall({
		target: UPDATE_MEMORIES_FN,
		arguments: [
			tx.object(objectId),
			tx.object(adminCapId),
			// pass JSON-encoded payload as bytes
			tx.pure(bcs.vector(bcs.u8()).serialize(bytes)),
		],
	});
	tx.setSender(agentAddress);
	tx.setGasOwner(feeAddress);

	// 3) sign & submit
	const built = await tx.build({ client });
	const agentSig = await keypair.signTransaction(built);
	const sponsorSig = await sponsorKeypair.signTransaction(built);
	await client.executeTransactionBlock({
		transactionBlock: built,
		signature: [agentSig.signature, sponsorSig.signature],
		requestType: "WaitForLocalExecution",
	});
}

// no scheduler here—driven by collect‐fee‐cron.ts
export { collectMemoriesOnce as collectMemoriesCron };
