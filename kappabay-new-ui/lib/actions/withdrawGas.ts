"use server";

import { prisma } from "../db";
import { decrypt } from "../utils";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

// Server Action: Given an agentId, find the agent in the DB,
// then build and sign a Sui Move transaction calling withdraw_gas.
// Note: withdraw_gas expects (agent: &mut Agent, cap: &AdminCap, amount: u64, ctx: &mut TxContext)
// Here we use agent.objectId for the agent, agent.capId for the admin cap,
// and pass 0 (u64) as the amount.
// The transaction is signed using the agent's decrypted private key from agentWalletKey.
// The signed transaction is returned (not sent) and will be executed elsewhere.
export async function withdrawGas(agentId: string, amount: number | string, walletAddress: string) {
	// Retrieve the agent from the database
	const agent = await prisma.agent.findUnique({
		where: { id: agentId },
	});

	if (!agent?.agentWalletKey) {
		throw new Error(`Agent wallet key not found for agent ${agentId}`);
	}
	// Derive the agent's backend sender address from the stored agentWalletKey.
	const decryptedKey = decrypt(agent.agentWalletKey);
	const keypair = Ed25519Keypair.fromSecretKey(decryptedKey);
	const agentAddress = keypair.getPublicKey().toSuiAddress();
	if (!agent) {
		throw new Error(`Agent not found for id ${agentId}`);
	}
	if (!agent.agentWalletKey) {
		throw new Error(`Agent wallet key not found for agent ${agentId}`);
	}

	// Initialize a Sui client (using testnet endpoint).
	const client = new SuiClient({ url: getFullnodeUrl("testnet") });

	// Define the expected AdminCap type. This assumes your contract defines an AdminCap with this type.
	const adminCapType = `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::AdminCap`;

	// Get owned objects for the derived address.
	const ownedCaps = await client.getOwnedObjects({
		owner: agentAddress, // using the backend sender address
		options: { showType: true },
	});

	// Filter the owned objects for one with the correct AdminCap type.
	const adminCapObject = ownedCaps.data.find((obj) => obj.data?.type === adminCapType);

	if (!adminCapObject?.data?.objectId) {
		throw new Error(`No AdminCap found for address ${agentAddress}`);
	}

	// Use the found AdminCap object's id.
	const adminCapId = adminCapObject.data.objectId;
	return { adminCapId, agentAddress };
}
