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
export async function withdrawGas(agentId: string, amount: number | string) {
	// Retrieve the agent from the database
	const agent = await prisma.agent.findUnique({
		where: { id: agentId },
	});
	if (!agent) {
		throw new Error(`Agent not found for id ${agentId}`);
	}
	if (!agent.agentWalletKey) {
		throw new Error(`Agent wallet key not found for agent ${agentId}`);
	}

	// Decrypt the encrypted wallet key
	const decryptedKey = decrypt(agent.agentWalletKey);

	// Create a keypair from the decrypted private key.
	const keypair = Ed25519Keypair.fromSecretKey(decryptedKey);

	// Derive the Sui address from the keypair.
	const ownerAddress = keypair.getPublicKey().toSuiAddress();

	// Initialize a Sui client (using testnet endpoint).
	const client = new SuiClient({ url: getFullnodeUrl("testnet") });

	// Define the expected AdminCap type. This assumes your contract defines an AdminCap with this type.
	const adminCapType = `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::AdminCap`;

	// Get owned objects for the derived address.
	const ownedCaps = await client.getOwnedObjects({
		owner: ownerAddress,
		options: { showType: true },
	});

	// Filter the owned objects for one with the correct AdminCap type.
	const adminCapObject = ownedCaps.data.find((obj) => obj.data?.type === adminCapType);

	if (!adminCapObject?.data?.objectId) {
		throw new Error(`No AdminCap found for address ${ownerAddress}`);
	}

	// Use the found AdminCap object's id.
	const adminCapId = adminCapObject.data.objectId;
	const tx = new Transaction();

	// Ensure the amount is in the proper format (e.g. as a BigInt or a string integer)
	const parsedAmount = BigInt(amount);
	// The amount is 0 (u64). The TxContext parameter is provided automatically.
	tx.moveCall({
		target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::withdraw_gas`,
		arguments: [
			tx.object(agent.objectId), // Agent object id from the DB
			tx.object(adminCapId), // Use the AdminCap id derived from the chain
			tx.pure.u64(parsedAmount), // Amount: parsed from input
		],
	});

	console.log("here");

	// Sign the transaction using the agent's keypair.
	const signedTx = tx.sign({ signer: keypair });
	console.log("here1");
	// Return the signed transaction without sending it.
	return signedTx;
}
