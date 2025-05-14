import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { serializeAgentConfig } from "./utils";
import { Deploy } from "./actions/deploy";

export type DeployAgentResult = {
	success: boolean;
	agentId?: string;
	publicUrl?: string;
	agentWallet?: string;
	error?: string;
};

export async function deployAgent(
	agentConfig: any,
	signAndExec: (tx: Transaction) => Promise<any>,
	ownerWallet: string,
	agentType: string
): Promise<DeployAgentResult> {
	const tx = new Transaction();

	// 1) create_agent call
	const [coin] = tx.splitCoins(tx.gas, [1 * 10_000_000]);
	tx.moveCall({
		target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::create_agent`,
		arguments: [
			tx.pure(bcs.vector(bcs.u8()).serialize(Array.from(Buffer.from(serializeAgentConfig(agentConfig))))),
			coin,
			tx.pure.string(agentConfig.image || ""),
		],
	});

	// 2) platform fee
	const feeAddress = process.env.NEXT_PUBLIC_FEE_ADDRESS!;
	const FEE_AMOUNT = 1 * 10_000_000;
	const [feeCoin] = tx.splitCoins(tx.gas, [FEE_AMOUNT]);
	tx.transferObjects([feeCoin], tx.pure.address(feeAddress));

	// 3) sign & send
	const txResult = await signAndExec(tx);

	// 4) extract object IDs
	let agentObjectId = "";
	let agentCapId = "";
	let adminCapId = "";

	if (txResult.objectChanges && Array.isArray(txResult.objectChanges)) {
		for (const c of txResult.objectChanges) {
			if (c.type === "created") {
				if (c.objectType.includes("AgentCap")) agentCapId = c.objectId;
				else if (c.objectType.includes("AdminCap")) adminCapId = c.objectId;
				else if (c.objectType.includes("Agent")) agentObjectId = c.objectId;
			}
		}
	}
	if (!agentObjectId || !agentCapId || !adminCapId) {
		throw new Error("Could not extract on-chain object IDs");
	}

	// 5) backend record
	const deployResult = await Deploy({
		agentConfig,
		onChainData: {
			agentObjectId,
			agentCapId,
			adminCapId,
			ownerWallet,
			txDigest: txResult.digest,
		},
		agentType,
	});
	if (!deployResult.success) {
		return { success: false, error: deployResult.error };
	}
	console.log("deployResult", deployResult);

	// 6) transfer AdminCap to final wallet
	if (deployResult.agentWallet) {
		const transferTx = new Transaction();
		transferTx.transferObjects([transferTx.object(adminCapId)], transferTx.pure.address(deployResult.agentWallet));
		await signAndExec(transferTx);
	}

	return deployResult;
}
