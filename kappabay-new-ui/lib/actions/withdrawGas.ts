"use server";

import { prisma } from "../db";
import { decrypt } from "../utils";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";

export async function withdrawGas(
	agentId: string,
	withdrawAmountMist: string,
	agentObjectId: string,
	gasOwnerAddress: string
) {
	// Retrieve the agent from the database
	const agent = await prisma.agent.findUnique({
		where: { id: agentId },
	});

	if (!agent?.agentWalletKey) {
		throw new Error(`Agent wallet key not found for agent ${agentId}`);
	}

	// Derive the agent's backend sender address from the stored agentWalletKey
	const decryptedKey = decrypt(agent.agentWalletKey);
	const keypair = Ed25519Keypair.fromSecretKey(decryptedKey);
	const agentAddress = keypair.getPublicKey().toSuiAddress();

	// Initialize a Sui client
	const client = new SuiClient({ url: getFullnodeUrl("testnet") });
	const PACKAGE_ID = process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID;
	// Define the expected AdminCap type
	const adminCapType = `${PACKAGE_ID}::agent::AdminCap`;

	// Get owned objects for the derived address
	const ownedCaps = await client.getOwnedObjects({
		owner: agentAddress,
		options: { showType: true },
	});

	// Filter the owned objects for one with the correct AdminCap type
	const adminCapObject = ownedCaps.data.find((obj) => obj.data?.type === adminCapType);

	if (!adminCapObject?.data?.objectId) {
		throw new Error(`No AdminCap found for address ${agentAddress}`);
	}

	// Use the found AdminCap object's id
	const adminCapId = adminCapObject.data.objectId;

	// Build the transaction on the server with extract_gas_for_transaction
	const tx = new Transaction();
	const coin: TransactionResult = tx.moveCall({
		target: `${PACKAGE_ID}::agent::extract_gas_for_transaction`,
		arguments: [tx.object(agentObjectId), tx.object(adminCapId), tx.pure.u64(withdrawAmountMist)],
	});
	// Capture the coin object returned and transfer it to the gas owner's address
	tx.transferObjects([coin], gasOwnerAddress);

	// Configure as a sponsored transaction
	tx.setSender(agentAddress); // Agent is the transaction sender
	tx.setGasOwner(gasOwnerAddress); // Connected wallet is the gas payer

	// Build the transaction bytes
	const builtTx = await tx.build({ client });

	// Sign the transaction with the agent's keypair
	const agentSignature = await keypair.signTransaction(builtTx);
	const serializedAgentSignature = agentSignature.signature;

	// Return everything needed for the frontend to complete the transaction
	return {
		adminCapId,
		agentAddress,
		presignedTxBytes: builtTx,
		agentSignature: serializedAgentSignature,
	};
}
