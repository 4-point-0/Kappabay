"use server";

import { prisma } from "@/lib/db";
import { getAgentKeypair, getAdminCapId, getObjectFields } from "./sui-utils";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

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
	const json = new TextDecoder().decode(Uint8Array.from(flat));
	const { memoryBlobId } = JSON.parse(json);

	if (memoryBlobId === latestBlobHash) return; // nothing to do

	// 2) prepare tx
	const { keypair, address: agentAddress } = await getAgentKeypair(agentId);
	const adminCapId = await getAdminCapId(client, agentAddress);
	const tx = new Transaction();
	// build JSON payload with memoryBlobId
	const jsonPayload = JSON.stringify({ memoryBlobId: latestBlobHash });
	tx.moveCall({
		target: UPDATE_MEMORIES_FN,
		arguments: [
			tx.object(objectId),
			tx.object(adminCapId),
			// pass JSON-encoded payload as bytes
			tx.pure(Uint8Array.from(Buffer.from(jsonPayload))),
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

// schedule every 6h
declare global {
	var __memCronScheduled: boolean | undefined;
}
console.log("global.__memCronScheduled", global.__memCronScheduled);

if (!global.__memCronScheduled) {
	global.__memCronScheduled = true;
	collectMemoriesOnce().catch(console.error);
	setInterval(() => collectMemoriesOnce().catch(console.error), INTERVAL);
}

export { collectMemoriesOnce as collectMemoriesCron };
