"use server";

import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { AgentConfig } from "@/lib/types";
import { serializeAgentConfig, deserializeAgentConfig } from "@/lib/utils";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromB64 } from "@mysten/sui/utils";

// Function to get config from an agent NFT
export async function getAgentConfig(agentObjectId: string) {
  try {
    // Initialize SUI client with environment variable
    const network = process.env.SUI_NETWORK || "testnet";
    const client = new SuiClient({ url: getFullnodeUrl(network as any) });

    // Get the object details
    const objectData = await client.getObject({
      id: agentObjectId,
      options: {
        showContent: true,
        showDisplay: true,
      },
    });

    // Log the full response to understand its structure
    console.log("Object data:", JSON.stringify(objectData));

    // Extract configuration from the object
    if (!objectData.data?.content) {
      throw new Error("Failed to get agent object content");
    }

    // Handle content structure safely
    let configData = null;
    const content = objectData.data.content;

    if (typeof content === "object") {
      // For debugging, log all available fields
      console.log("Content fields:", Object.keys(content));

      if ("fields" in content && content.fields) {
        // Access fields object
        const fields = content.fields;
        console.log("Fields:", Object.keys(fields));

        // Try to find configuration field
        if ("configuration" in fields) {
          configData = fields.configuration;
        }
      }
    }

    if (!configData) {
      throw new Error("Configuration field not found in agent object");
    }

    // Decode the configuration data
    let configString;
    if (Array.isArray(configData)) {
      // If it's an array of bytes
      configString = new TextDecoder().decode(
        new Uint8Array(configData as number[])
      );
    } else if (typeof configData === "string") {
      // If it's base64 encoded
      try {
        configString = new TextDecoder().decode(fromB64(configData));
      } catch (e) {
        // If decoding fails, try using the string directly
        configString = configData;
      }
    } else {
      throw new Error(
        `Unexpected configuration data format: ${typeof configData}`
      );
    }

    const agentConfig = deserializeAgentConfig(configString);

    return {
      success: true,
      config: agentConfig,
    };
  } catch (error) {
    console.error("Failed to get agent config:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to update config on an agent NFT
export async function updateAgentConfig(
  agentObjectId: string,
  adminCapId: string,
  config: AgentConfig,
  privateKey: string
) {
  try {
    // Initialize SUI client with environment variable
    const network = process.env.SUI_NETWORK || "testnet";
    const client = new SuiClient({ url: getFullnodeUrl(network as any) });

    // Create keypair from private key
    const keypair = Ed25519Keypair.fromSecretKey(
      Buffer.from(privateKey, "hex")
    );

    // Create transaction
    const tx = new Transaction();

    // Call the update_configuration function in the agent contract
    tx.moveCall({
      target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::update_configuration`,
      arguments: [
        tx.object(agentObjectId),
        tx.object(adminCapId),
        tx.pure(
          bcs
            .vector(bcs.u8())
            .serialize(Array.from(Buffer.from(serializeAgentConfig(config))))
        ),
      ],
    });

    // Sign and execute the transaction
    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
    });

    return {
      success: true,
      txDigest: result.digest,
    };
  } catch (error) {
    console.error("Failed to update agent config:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
