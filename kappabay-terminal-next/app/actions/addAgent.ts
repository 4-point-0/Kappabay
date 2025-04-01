"use server";

import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { supabase } from "../../lib/supabaseClient";

/**
 * Server Action to add an agent to the Supabase 'agents' table.
 *
 * @param suiWalletAddress - The SUI wallet address of the user.
 * @param agentCapId - The NFT object ID of the agent cap.
 * @returns An object indicating success or failure.
 */
export async function addAgent(
	suiWalletAddress: string,
	agentCapId: string
): Promise<{ success: boolean; error?: string }> {
	try {
		// Initialize SUI client for the testnet
		const client = new SuiClient({ url: getFullnodeUrl("testnet") });

		// Fetch the agent cap object from SUI
		const agentCapObject: any = await client.getObject({
			id: agentCapId,
			options: { showContent: true },
		});

		// Validate the retrieved object
		if (!agentCapObject || !agentCapObject.details || !agentCapObject.details.data.fields) {
			throw new Error("Invalid agent cap object data.");
		}

		// Extract owner information from the agent cap object
		const owner = agentCapObject.details.data.owner;

		// Check if the owner matches the provided SUI wallet address
		if (owner !== suiWalletAddress) {
			// Adjust property access if necessary
			throw new Error("The agent cap object does not belong to the provided SUI wallet address.");
		}
		const fields = agentCapObject.details.data.fields;
		const agentId = fields?.agentId;

		if (!agentId) {
			throw new Error("agentId not found in the agent cap object.");
		}

		// Insert the agent information into the Supabase 'agents' table
		const { data, error } = await supabase
			.from("agents")
			.insert([{ agent_id: agentId, agent_cap_id: agentCapId, deployer: suiWalletAddress }]);

		if (error) {
			throw error;
		}

		return { success: true };
	} catch (error) {
		console.error("Failed to add agent:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
