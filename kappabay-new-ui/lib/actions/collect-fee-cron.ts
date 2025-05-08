"use server";

import { prisma } from "@/lib/db";
import { withdrawGas } from "@/lib/actions/withdraw-gas";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { stopService } from "@/lib/actions/manage-docker-service";

const FEE_AMOUNT = 1_000_000; // Mist
const feeAddress = process.env.NEXT_PUBLIC_FEE_ADDRESS!;
const sponsorPkEnv = process.env.FEE_RECEIVER_PK!;
const sponsorKeypair = Ed25519Keypair.fromSecretKey(sponsorPkEnv);
const client = new SuiClient({ url: getFullnodeUrl("testnet") });

async function collectFeesOnce() {
	// fetch all active agents
	const activeAgents = await prisma.agent.findMany({
		where: { status: "ACTIVE" },
	});

	// process one by one (or switch back to Promise.all for parallel)
	for (const agent of activeAgents) {
		if (!agent.agentWalletKey || !agent.objectId) continue;
		try {
			await collectFeeForAgent(agent.objectId, agent.id);
		} catch (err) {
			console.error(`Fee collection failed for agent ${agent.id}`);

			// on failure, stop the agent's Docker service
			try {
				const message = agent.id;
				const msgBytes = Buffer.from(message, "utf8");
				// sign the message with your sponsor key
				const { signature } = await sponsorKeypair.signPersonalMessage(msgBytes);
				const address = sponsorKeypair.getPublicKey().toSuiAddress();

				await stopService(agent.id, message, signature, address);
				console.log(`Service for agent ${agent.id} stopped due to cron error.`);
			} catch (stopErr) {
				console.error(`Failed to stop service for agent ${agent.id}`);
			}
		}
	}
}

/**
 * Build, presign and execute a sponsored fee‐withdrawal for one agent
 */
async function collectFeeForAgent(agentObjectId: string, agentId: string) {
	// 1) backend: build & presign extract_gas transaction
	const {
		presignedTxBytes, // Serialized transaction block bytes
		agentSignature, // signature by agent key
	} = await withdrawGas(agentId, FEE_AMOUNT.toString(), agentObjectId, feeAddress);

	// 2) sponsor signs the same tx bytes
	const sponsorSigRes = await sponsorKeypair.signTransaction(presignedTxBytes);

	// 3) submit with both signatures
	await client.executeTransactionBlock({
		transactionBlock: presignedTxBytes,
		signature: [agentSignature, sponsorSigRes.signature],
		requestType: "WaitForLocalExecution",
		options: {
			showEvents: true,
			showEffects: true,
			showObjectChanges: true,
			showBalanceChanges: true,
			showInput: true,
		},
	});
}

// schedule once per process
declare global {
	var __feeCronScheduled: boolean | undefined;
}
if (!global.__feeCronScheduled) {
	global.__feeCronScheduled = true;
	// run immediately, then every hour
	collectFeesOnce().catch(console.error);
	setInterval(() => collectFeesOnce().catch(console.error), 60 * 60 * 1000);
}

// also export if you ever want to invoke manually
export { collectFeesOnce as collectFeesCron };
