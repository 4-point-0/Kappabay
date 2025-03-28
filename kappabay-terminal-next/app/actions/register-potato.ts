"use server";

import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

export async function registerPotato(potatoId: string) {
	try {
		// Validate environment variables
		const privateKey = process.env.SUI_PRIVATE_KEY;
		if (!privateKey) throw new Error("SUI_PRIVATE_KEY not set in environment");

		const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
		const gameManagerId = process.env.NEXT_PUBLIC_GAME_MANAGER_ID;
		const gameManagerCapId = process.env.GAME_MANAGER_CAP_ID;
		const gameId = process.env.NEXT_PUBLIC_GAME_ID;

		if (!packageId || !gameManagerId || !gameManagerCapId || !gameId) {
			throw new Error("Missing required game manager environment variables");
		}

		// Initialize keypair and client
		const keypair = Ed25519Keypair.fromSecretKey(privateKey);
		const client = new SuiClient({ url: getFullnodeUrl("testnet") });

		// Build transaction
		const tx = new Transaction();
		tx.setGasBudget(20000000);

		tx.moveCall({
			target: `${packageId}::game_manager::register_potato`,
			arguments: [tx.object(gameManagerId), tx.object(gameManagerCapId), tx.object(potatoId), tx.object(gameId)],
		});

		// Execute transaction
		const result = await client.signAndExecuteTransaction({
			transaction: tx,
			signer: keypair,
			options: {
				showEffects: true,
				showEvents: true,
			},
		});

		return {
			success: true,
			digest: result.digest,
			effects: result.effects,
		};
	} catch (error) {
		console.error("Failed to register potato:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

