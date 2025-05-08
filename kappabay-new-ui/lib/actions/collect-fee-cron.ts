"use server";

import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/utils";
import { withdrawGas } from "@/lib/actions/withdraw-gas";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

const FEE_AMOUNT = 1_000_000; // Mist
const feeAddress = process.env.NEXT_PUBLIC_FEE_ADDRESS!;
const sponsorPkEnv = process.env.FEE_RECEIVER_PK!;
const sponsorKeypair = Ed25519Keypair.fromSecretKey(decrypt(sponsorPkEnv));
const client = new SuiClient({ url: getFullnodeUrl("testnet") });

async function collectFeesOnce() {
	// only agents with status === "active"
	const active = await prisma.agent.findMany({ where: { status: "active" } });

	await Promise.all(
		active.map(async (agent) => {
			if (!agent.agentWalletKey || !agent.objectId) return;

			// build & presign the extract-and-send transaction
			const { presignedTxBytes } = await withdrawGas(agent.id, FEE_AMOUNT.toString(), agent.objectId, feeAddress);

			// re-derive agent keypair so we can sign our block here
			const agentKey = Ed25519Keypair.fromSecretKey(decrypt(agent.agentWalletKey));

			// sign & execute with BOTH keys (agent + sponsor)
			await client.signAndExecuteTransactionBlock({
				transactionBlock: presignedTxBytes,
				signers: [agentKey, sponsorKeypair],
			});
		})
	);
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
