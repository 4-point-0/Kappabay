import {
  EventId,
  SuiClient,
  SuiEvent,
  SuiEventFilter,
} from "@mysten/sui/client";

import { CONFIG } from "../config";
import { prisma } from "../db";
import { getClient } from "../sui-utils";
import {
  handleAgentPromptCreated,
  handlePromptWithMultiCallbacks,
} from "./agent-handler";

type SuiEventsCursor = EventId | null | undefined;

type EventExecutionResult = {
  cursor: SuiEventsCursor;
  hasNextPage: boolean;
};

type EventTracker = {
  // The module that defines the type, with format `package::module`
  type: string;
  filter: SuiEventFilter;
  callback: (events: SuiEvent[], type: string) => any;
  // Add a custom initial cursor option
  initialCursor?: EventId;
};

const EVENTS_TO_TRACK: EventTracker[] = [
  {
    type: `${CONFIG.AGENT_CONTRACT.packageId}::agent::PromptInferred`,
    filter: {
      MoveEventType: `${CONFIG.AGENT_CONTRACT.packageId}::agent::PromptInferred`,
    },
    callback: handleAgentPromptCreated,
    // Set custom initial cursor to start from a specific transaction
    initialCursor: CONFIG.INITIAL_TRANSACTION_DIGEST
      ? {
          txDigest: CONFIG.INITIAL_TRANSACTION_DIGEST, // Replace with your contract deployment transaction digest
          eventSeq: "0", // Start from the first event in that transaction
        }
      : undefined,
  },
  {
    type: `${CONFIG.AGENT_CONTRACT.packageId}::prompt_manager::PromptWithMultiCallbacks`,
    filter: {
      MoveEventType: `${CONFIG.AGENT_CONTRACT.packageId}::prompt_manager::PromptWithMultiCallbacks`,
    },
    callback: handlePromptWithMultiCallbacks,
    initialCursor: CONFIG.INITIAL_TRANSACTION_DIGEST
      ? {
          txDigest: CONFIG.INITIAL_TRANSACTION_DIGEST,
          eventSeq: "0",
        }
      : undefined,
  },
  // {
  //   type: `${CONFIG.AGENT_CONTRACT.packageId}::agent::PROMPT_CREATED_WITH_CALLBACK`,
  //   filter: {
  //     MoveEventType: `${CONFIG.AGENT_CONTRACT.packageId}::agent::PROMPT_CREATED_WITH_CALLBACK`,
  //   },
  //   callback: handleAgentPromptCreated,
  //   // Set custom initial cursor to start from a specific transaction
  //   initialCursor: CONFIG.INITIAL_TRANSACTION_DIGEST
  //     ? {
  //         txDigest: CONFIG.INITIAL_TRANSACTION_DIGEST, // Replace with your contract deployment transaction digest
  //         eventSeq: "0", // Start from the first event in that transaction
  //       }
  //     : undefined,
  // }
];

const executeEventJob = async (
  client: SuiClient,
  tracker: EventTracker,
  cursor: SuiEventsCursor
): Promise<EventExecutionResult> => {
  console.log(`Running event job for ${tracker.type} with cursor:`, cursor);
  try {
    // get the events from the chain.
    // For this implementation, we are going from start to finish.
    // This will also allow filling in a database from scratch!
    const { data, hasNextPage, nextCursor } = await client.queryEvents({
      query: tracker.filter,
      cursor,
      order: "ascending",
    });

    // handle the data transformations defined for each event
    await tracker.callback(data, tracker.type);

    // We only update the cursor if we fetched extra data (which means there was a change).
    if (nextCursor && data.length > 0) {
      await saveLatestCursor(tracker, nextCursor);

      return {
        cursor: nextCursor,
        hasNextPage,
      };
    }
  } catch (e) {
    console.error(e);
  }
  // By default, we return the same cursor as passed in.
  return {
    cursor,
    hasNextPage: false,
  };
};

const runEventJob = async (
  client: SuiClient,
  tracker: EventTracker,
  cursor: SuiEventsCursor
) => {
  const result = await executeEventJob(client, tracker, cursor);

  // Trigger a timeout. Depending on the result, we either wait 0ms or the polling interval.
  setTimeout(
    () => {
      runEventJob(client, tracker, result.cursor);
    },
    result.hasNextPage ? 0 : CONFIG.POLLING_INTERVAL_MS
  );
};

/**
 * Gets the latest cursor for an event tracker, either from the DB,
 * from the initial cursor specified in the tracker, or undefined
 */
const getLatestCursor = async (tracker: EventTracker) => {
  // First try to get the cursor from the database
  const cursor = await prisma.cursor.findUnique({
    where: {
      id: tracker.type,
    },
  });

  // If we have a cursor in the database, use that
  if (cursor) {
    return cursor;
  }

  // If we have an initial cursor specified and no cursor in the DB,
  // use the initial cursor (for first-time setup)
  if (tracker.initialCursor) {
    return tracker.initialCursor;
  }

  // Otherwise return undefined (will start from the beginning)
  return undefined;
};

/**
 * Saves the latest cursor for an event tracker to the db, so we can resume
 * from there.
 * */
const saveLatestCursor = async (tracker: EventTracker, cursor: EventId) => {
  const data = {
    eventSeq: cursor.eventSeq,
    txDigest: cursor.txDigest,
  };

  return prisma.cursor.upsert({
    where: {
      id: tracker.type,
    },
    update: data,
    create: { id: tracker.type, ...data },
  });
};

/**
 * Manually set a cursor for an event tracker
 * This can be used to reset the cursor to a specific point
 */
export const setEventCursor = async (
  trackerType: string,
  txDigest: string,
  eventSeq: string = "0"
) => {
  const data = {
    eventSeq,
    txDigest,
  };

  return prisma.cursor.upsert({
    where: {
      id: trackerType,
    },
    update: data,
    create: { id: trackerType, ...data },
  });
};

/// Sets up all the listeners for the events we want to track.
export const setupListeners = async () => {
  for (const event of EVENTS_TO_TRACK) {
    runEventJob(getClient(CONFIG.NETWORK), event, await getLatestCursor(event));
  }
};

// Helper function to create a cursor from a transaction digest
export const createCursorFromTx = (
  txDigest: string,
  eventSeq: string = "0"
): EventId => {
  return {
    txDigest,
    eventSeq,
  };
};
