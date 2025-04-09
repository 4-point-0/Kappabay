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
  callback?: string;
};

/**
 * Helper function to throttle concurrent operations
 */
async function withThrottling<T>(
  tasks: (() => Promise<T>)[], 
  concurrencyLimit: number
): Promise<T[]> {
  const results: T[] = [];
  const runningTasks = new Set<Promise<void>>();
  
  // Create a queue of tasks
  const taskQueue = [...tasks];
  
  // Process the next task in the queue
  let taskPromise: Promise<void>;

  async function processNext(): Promise<void> {
    if (taskQueue.length === 0) return;
    
    const task = taskQueue.shift()!;
    
    taskPromise = (async () => {
      try {
        const result = await task();
        results.push(result);
      } catch (error) {
        console.error('Task failed:', error);
      } finally {
        runningTasks.delete(taskPromise);
        // Process next task when this one completes
        await processNext();
      }
    })();
    
    runningTasks.add(taskPromise);
  }
  
  // Start initial batch of tasks up to concurrency limit
  const initialBatch = Math.min(concurrencyLimit, tasks.length);
  for (let i = 0; i < initialBatch; i++) {
    await processNext();
  }
  
  // Wait for all tasks to complete
  await Promise.all(Array.from(runningTasks));
  
  return results;
}

/**
 * Handles the PROMPT_CREATED event emitted by the `agent` module.
 */
export const handleAgentPromptCreated = async (
  events: SuiEvent[],
  type: string
) => {
  // First, validate all events and extract data
  const eventData: {
    data: PromptCreatedEvent;
    timestamp: number;
  }[] = [];

  for (const event of events) {
    if (!event.type.startsWith(type)) throw new Error("Invalid event type");
    console.log("Event:", event);
    
    const data = event.parsedJson as PromptCreatedEvent;
    const timestamp = event?.timestampMs ? Number(event.timestampMs) : 112312312;
    
    eventData.push({ data, timestamp });
  }

  // Create database records first (fast operation)
  const dbUpdates = eventData.map(({ data, timestamp }) => {
    const update: Prisma.PromptCreateInput = {
      objectId: data?.objectId,
      creator: data?.sender,
      promptText: data?.question,
      timestamp: new Date(timestamp),
    };
    
    return prisma.prompt.upsert({
      where: { objectId: data?.objectId },
      create: update,
      update,
    });
  });

  // Save all records to database concurrently
  await Promise.all(dbUpdates);

  // Create a shared signer instance to use for all events
  const signer = createSignerFromPrivateKey(CONFIG.PRIVATE_KEY);

  // Define processing tasks
  const processingTasks = eventData.map(({ data }) => {
    return async () => {
      try {
        // Call the agent-client API
        const response = await apiClient.sendMessage(
          CONFIG.AGENT_ID,
          data?.question,
          data?.sender,
          null
        );

        // Process the response based on whether we have a callback
        if (data?.callback) {
          return executeCallback(
            data.callback, 
            data.question, 
            response, 
            signer, 
            data.objectId, 
            data.sender
          );
        } else {
          return populateAgentObject(
            data?.question,
            data?.sender,
            data?.objectId,
            response?.[0]?.text,
            signer
          );
        }
      } catch (error) {
        console.error(`Failed to process event ${data.id}:`, error);
        // Don't throw so other events can continue processing
        return null;
      }
    };
  });

  // Process with throttling - adjust the concurrency limit based on RPC limits
  // A value of 3-5 is usually safe for most RPC providers
  const concurrencyLimit = 3;
  await withThrottling(processingTasks, concurrencyLimit);
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
    
    // Create and execute the callback transaction
    const callbackTx = new Transaction();
    callbackTx.moveCall({
      target: `${packageId}::${module}::${method}`,
      arguments: [callbackTx.pure.string(prompt), callbackTx.pure.string(response)],
    });

    const callbackResult = await client.signAndExecuteTransaction({
      transaction: callbackTx,
      options: {
        showEffects: true,
        showEvents: true,
      },
      signer,
    });

    console.log(`Callback executed successfully: ${callbackResult.digest}`);
    
    // Create and execute the populate transaction (separate transaction)
    const populateTx = new Transaction();
    populateTx.moveCall({
      target: `${CONFIG.AGENT_CONTRACT.packageId}::agent::populate_prompt`,
      arguments: [
        populateTx.object(objectId),
        populateTx.pure.string(response),
        populateTx.pure.address(creator),
      ],
    });

    const populateResult = await client.signAndExecuteTransaction({
      transaction: populateTx,
      options: {
        showEffects: true,
        showEvents: true,
      },
      signer,
    });

    console.log(`Prompt populated successfully: ${populateResult.digest}`);
    return { callbackResult, populateResult };
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
        tx.object(objectId),
        tx.pure.string(response),
        tx.pure.address(creator),
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