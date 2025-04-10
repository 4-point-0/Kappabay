import { SuiEvent } from "@mysten/sui/client";
import { Prisma } from "@prisma/client";
import { Transaction } from "@mysten/sui/transactions";

import { prisma } from "../db";
import { apiClient } from "../helpers/agent-client";
import { CONFIG } from "../config";
import { getClient } from "../sui-utils";
import { createSignerFromPrivateKey } from "../utils/signer";

// Define the type for PROMPT_CREATED event
type PromptCreatedEvent = {
  id: string;
  objectId: string;
  sender: string;
  question: string;
  walletAddress: string;
  callback?: string;
};

/**
 * Handles the PROMPT_CREATED event emitted by the `agent` module.
 */
export const handleAgentPromptCreated = async (
  events: SuiEvent[],
  type: string
) => {
  const updates: Record<string, Prisma.PromptCreateInput> = {};

  const signer = createSignerFromPrivateKey(CONFIG.PRIVATE_KEY);

  for (const event of events) {
    if (!event.type.startsWith(type)) throw new Error("Invalid event type");
    console.log("Event:", event);
    const data = event.parsedJson as PromptCreatedEvent;
    const timestamp = event?.timestampMs;

    updates[data.id] = {
      objectId: data.id,
      creator: data?.sender,
      promptText: data?.question,
      timestamp: new Date(Number(timestamp) || 112312312),
    };

    // get the port using the data.walletAddress
    const response = await fetch(`${process.env.LAUNCHPAD_URL || "http://localhost:3000"}/api/get-agent-by-wallet?walletAddress=${data?.walletAddress}`)

    const agentInfo = await response.json();
    if (agentInfo.error) {
      console.error("Failed to get agent info:", agentInfo.error);
      return;
    }
    // Extract the port from the agentInfo
    const { port } = agentInfo;

    // Check if port is available, if it is not available, log an error
    if (!port) {
      console.error("Failed to get agent port:", agentInfo);
      return;
    }

    try {
      // call the agent-client API
      const response = await apiClient.sendMessage(
        CONFIG.AGENT_ID,
        data?.question,
        data?.sender,
        null,
        port
      );

      if (data?.callback) {
        // execute the callback things
        await executeCallback(data.callback, data.question, response, signer, data.objectId, data.sender);
      } else {
        // populate the object with the response
        await populateAgentObject(
          data?.question,
          data?.sender,
          data?.objectId,
          response?.[0]?.text,
          signer,
        );
      }
    } catch (error) {
      console.error("Failed to call external API:", error);
    }
  }
  // Upsert all prompts to the database
  const promises = Object.values(updates).map((update) =>
    prisma.prompt.upsert({
      where: {
        objectId: update.objectId,
      },
      create: update,
      update,
    })
  );
  await Promise.all(promises);
};

/**
 * Executes a callback on the Sui network
 * @param callbackInfo - String containing package::module::function
 * @param prompt - The original prompt/question
 * @param response - The response from the AI
 */
async function executeCallback(
  callbackInfo: string,
  prompt: string,
  response: string,
  signer: any,
  objectId: string,
  creator: string
) {
  try {
    // Parse the callback string to get package, module and function
    const [packageId, module, method] = callbackInfo.split("::");

    if (!packageId || !module || !method) {
      throw new Error(`Invalid callback format: ${callbackInfo}`);
    }

    console.log(`Executing callback: ${packageId}::${module}::${method} with ${prompt} and ${response}`);

    // Create a transaction block to call the function
    const client = getClient(CONFIG.NETWORK);
    const tx = new Transaction();

    // Call the move function with the prompt and response as parameters
    tx.moveCall({
      target: `${packageId}::${module}::${method}`,
      arguments: [tx.pure.string(prompt), tx.pure.string(response)],
    });

    // Sign and execute the transaction
    // Note: You'll need to have a signer configured in your client
    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
      signer,
    });

     // Call the populate_prompt method on the agent contract
     tx.moveCall({
      target: `${CONFIG.AGENT_CONTRACT.packageId}::agent::populate_prompt`,
      arguments: [
        tx.object(objectId), // The Prompt object itself
        tx.pure.string(response), // The response
        tx.pure.address(creator), // The receiver address
      ],
    });

    // Sign and execute the transaction
    const result1 = await client.signAndExecuteTransaction({
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
      signer,
    });

    console.log(`Callback executed successfully: ${result.digest} and populate successfully: ${result1.digest}`);
    return result;
  } catch (error) {
    console.error(`Failed to execute callback: ${error}`);
    throw error;
  }
}

/**
 * Populates an agent object with a prompt and response
 * @param prompt - The original prompt/question
 * @param creator - The creator/sender address
 * @param objectId - The ID of the object to populate
 * @param response - The response from the AI
 * @param signer - The signer to execute the transaction
 */
async function populateAgentObject(
  prompt: string,
  creator: string,
  objectId: string,
  response: string,
  signer: any
) {
  try {
    console.log(`Populating object: ${objectId} with prompt: ${prompt} and response: ${response}`);

    // Create a transaction block
    const client = getClient(CONFIG.NETWORK);
    const tx = new Transaction();

    // Call the populate_prompt method on the agent contract
    tx.moveCall({
      target: `${CONFIG.AGENT_CONTRACT.packageId}::agent::populate_prompt`,
      arguments: [
        tx.object(objectId), // The Prompt object itself
        tx.pure.string(response), // The response
        tx.pure.address(creator), // The receiver address
      ],
    });

    // Sign and execute the transaction
    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
      signer,
    });

    console.log(`Object populated successfully: ${result.digest}`);
    return result;
  } catch (error) {
    console.error(`Failed to populate object: ${error}`);
    throw error;
  }
}
