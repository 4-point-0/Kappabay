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

type PromptWithMultiCallbacksEvent = {
  id: string;
  objectId: string;
  sender: string;
  prompt_text: string;
  callbacks_json: string; // JSON string containing callbacks
  agent_wallet: string;
};

type Callback = {
  package: string;
  module: string;
  function: string;
  requires_user_wallet: boolean;
  type_arguments?: string[];
  arguments?: any[];
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

    try {
      // call the agent-client API
      const response = await apiClient.sendMessage(
        CONFIG.AGENT_ID,
        data?.question,
        data?.sender,
        null
      );

      if (data?.callback) {
        // execute the callback things
        await executeCallback(
          data.callback,
          data.question,
          response,
          signer,
          data.objectId,
          data.sender
        );
      } else {
        // populate the object with the response
        await populateAgentObject(
          data?.question,
          data?.sender,
          data?.objectId,
          response?.[0]?.text,
          signer
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

    console.log(
      `Executing callback: ${packageId}::${module}::${method} with ${prompt} and ${response}`
    );

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

    console.log(
      `Callback executed successfully: ${result.digest} and populate successfully: ${result1.digest}`
    );
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
    console.log(
      `Populating object: ${objectId} with prompt: ${prompt} and response: ${response}`
    );

    // Create a transaction block
    const client = getClient(CONFIG.NETWORK);
    const tx = new Transaction();

    // Call the populate_prompt method on the agent contract
    tx.moveCall({
      target: `${CONFIG.AGENT_CONTRACT.packageId}::prompt_manager::add_response`,
      arguments: [
        tx.object(CONFIG.PROMPT_MANAGER_ID), // Add your prompt manager ID to CONFIG
        tx.object(CONFIG.AGENT_CAP_ID), // Add your agent cap ID to CONFIG
        tx.object(objectId), // The prompt object ID
        tx.pure.string(response),
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

export const handlePromptWithMultiCallbacks = async (
  events: SuiEvent[],
  type: string
) => {
  const updates: Record<string, Prisma.PromptCreateInput> = {};
  const signer = createSignerFromPrivateKey(CONFIG.PRIVATE_KEY);

  for (const event of events) {
    if (!event.type.startsWith(type)) throw new Error("Invalid event type");
    console.log("Processing multi-callback event:", event);
    const data = event.parsedJson as PromptWithMultiCallbacksEvent;
    const timestamp = event?.timestampMs;

    // Save to database
    updates[data.id] = {
      objectId: data.id,
      creator: data?.sender,
      promptText: data?.prompt_text,
      timestamp: new Date(Number(timestamp) || Date.now()),
    };

    try {
      const response = await apiClient.sendMessage(
        CONFIG.AGENT_ID,
        data?.prompt_text,
        data?.sender,
        null
      );
      // Parse the callbacks from the JSON string
      let callbacks: Callback[] = [];
      try {
        const callbacksJsonString = data.callbacks_json.replace(
          /^"(.*)"$/,
          "$1"
        );
        callbacks = JSON.parse(callbacksJsonString);
        if (!Array.isArray(callbacks)) {
          console.error("Callbacks JSON is not an array:", data.callbacks_json);
          callbacks = [];
        }
      } catch (error) {
        console.error(
          "Failed to parse callbacks JSON:",
          error,
          data.callbacks_json
        );
      }

      // Process callbacks
      if (callbacks.length > 0) {
        // Separate callbacks by type
        const oracleCallbacks = callbacks.filter(
          (cb) => !cb.requires_user_wallet
        );
        const userCallbacks = callbacks.filter((cb) => cb.requires_user_wallet);

        // Execute callbacks that don't require user wallet
        if (oracleCallbacks.length > 0) {
          await executeOracleCallbacks(
            oracleCallbacks,
            data.prompt_text,
            response?.[0]?.text || "",
            signer,
            data.id,
            data.sender
          );
        }

        // For callbacks that require user wallet, emit an event instead of storing
        if (userCallbacks.length > 0) {
          console.log(
            `User callbacks detected for address ${data.sender}. In a production system, we would emit an event here with the following data:`
          );
          console.log({
            type: "USER_CALLBACK_REQUIRED",
            promptId: data.id,
            userAddress: data.sender,
            prompt: data.prompt_text,
            response: response?.[0]?.text || "",
            callbacks: userCallbacks,
          });

          // COMMENT: Here we would emit an event to a WebSocket, SSE, or other real-time notification system
        }
      }

      // Always populate the response to the original object
      await populateAgentObject(
        data?.prompt_text,
        data?.sender,
        data?.id,
        response?.[0]?.text || "",
        signer
      );
    } catch (error) {
      console.error("Failed to process multi-callback event:", error);
    }
  }

  // Save all prompts to database
  const promises = Object.values(updates).map((update) =>
    prisma.prompt.upsert({
      where: { objectId: update.objectId },
      create: update,
      update,
    })
  );

  await Promise.all(promises);
};

async function executeOracleCallbacks(
  callbacks: Callback[],
  prompt: string,
  response: string,
  signer: any,
  objectId: string,
  sender: string,
  batchCallbacks: boolean = true
) {
  const results = [];
  const client = getClient(CONFIG.NETWORK);

  if (batchCallbacks && callbacks.length > 0) {
    // Create a single transaction with all callbacks
    try {
      const tx = new Transaction();

      // Add all callbacks to the transaction
      for (const callback of callbacks) {
        console.log(
          `Adding callback to batch: ${callback.package}::${callback.module}::${callback.function}`
        );

        createMoveCall(tx, callback);
      }

      // Execute the transaction
      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      console.log(
        `Batch of ${callbacks.length} callbacks executed successfully: ${result.digest}`
      );

      // Add all callbacks to results
      for (const callback of callbacks) {
        results.push({
          callback: `${callback.package}::${callback.module}::${callback.function}`,
          success: true,
          digest: result.digest,
          batchExecuted: true,
        });
      }
    } catch (error: any) {
      console.error(`Failed to execute batch of callbacks: ${error}`);

      // Mark all callbacks as failed
      for (const callback of callbacks) {
        results.push({
          callback: `${callback.package}::${callback.module}::${callback.function}`,
          success: false,
          error: error.message,
          batchExecuted: true,
        });
      }

      // If batch fails, try executing individually if there are multiple callbacks
      if (callbacks.length > 1) {
        console.log("Batch execution failed, trying individual execution...");
        return executeOracleCallbacks(
          callbacks,
          prompt,
          response,
          signer,
          objectId,
          sender,
          false
        );
      }
    }
  } else {
    // Execute each callback in a separate transaction
    for (const callback of callbacks) {
      try {
        console.log(
          `Executing oracle callback: ${callback.package}::${callback.module}::${callback.function}`
        );

        const tx = new Transaction();

        // Create the transaction to call the function
        createMoveCall(tx, callback);

        // Execute the transaction
        const result = await client.signAndExecuteTransaction({
          transaction: tx,
          signer,
          options: {
            showEffects: true,
            showEvents: true,
          },
        });

        results.push({
          callback: `${callback.package}::${callback.module}::${callback.function}`,
          success: true,
          digest: result.digest,
          batchExecuted: false,
        });

        console.log(`Oracle callback executed successfully: ${result.digest}`);
      } catch (error: any) {
        console.error(`Failed to execute oracle callback: ${error}`);
        results.push({
          callback: `${callback.package}::${callback.module}::${callback.function}`,
          success: false,
          error: error.message,
          batchExecuted: false,
        });
      }
    }
  }

  return results;
}

function createMoveCall(tx: Transaction, callback: Callback) {
  return tx.moveCall({
    target: `${callback.package}::${callback.module}::${callback.function}`,
    arguments: callback.arguments
      ? callback.arguments.map((arg) => {
          switch (arg.type) {
            case "string":
              return tx.pure.string(arg.value);
            case "address":
              return tx.pure.address(arg.value);
            case "u64":
              return tx.pure.u64(arg.value);
            case "u8":
              return tx.pure.u8(arg.value);
            case "u16":
              return tx.pure.u16(arg.value);
            case "u32":
              return tx.pure.u32(arg.value);
            case "u128":
              return tx.pure.u128(arg.value);
            case "u256":
              return tx.pure.u256(arg.value);
            case "bool":
              return tx.pure.bool(arg.value);
            case "object":
              return tx.object(arg.value);
            case "shared_object":
              return tx.sharedObjectRef(arg.value);
            default:
              throw new Error(`Unsupported argument type: ${arg.type}`);
          }
        })
      : [],
    typeArguments: callback.type_arguments || [],
  });
}
