import {
    type Action,
    type ActionExample,
    type IAgentRuntime,
    type Memory,
    type State,
    type HandlerCallback,
    elizaLogger,
} from "@elizaos/core";
import { Transaction } from "@mysten/sui/transactions";
import {
    executeSuiTransaction,
    getKeypair,
    getSuiClient,
    validateSuiEvent,
    validateSuiSettings,
} from "../utils/utils";
import { UniquePlayerCountEventSchema } from "../types/types";
import { checkUniquePlayerCountExample } from "../templates/examples";

const SUI_MODULE_NAME = "game_manager";
const SUI_FUNCTION_NAME = "check_unique_player_count";

export const checkUniquePlayerCount: Action = {
    name: "CHECK_UNIQUE_PLAYER_COUNT",
    similes: [
        "GET_UNIQUE_PLAYERS",
        "CHECK_PLAYER_COUNT",
        "UNIQUE_PLAYERS",
        "PLAYER_COUNT",
        "GET_PLAYER_STATS",
    ],
    description: "Check the unique player count for a specific game",
    suppressInitialMessage: true,
    validate: async () => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: Record<string, unknown>,
        callback?: HandlerCallback
    ) => {
        try {
            const settings = validateSuiSettings(runtime, [
                "SUI_PRIVATE_KEY",
                "SUI_NETWORK",
                "SUI_GAME_MANAGER_ID",
                "SUI_GAME_ID",
                "SUI_PACKAGE_ID",
            ]);

            const client = getSuiClient(settings.SUI_NETWORK);
            const keypair = getKeypair(settings.SUI_PRIVATE_KEY);

            const tx = new Transaction();
            // tx.setGasBudget(20_000_000);
            tx.moveCall({
                target: `${settings.SUI_PACKAGE_ID}::${SUI_MODULE_NAME}::${SUI_FUNCTION_NAME}`,
                arguments: [
                    tx.object(settings.SUI_GAME_MANAGER_ID),
                    tx.object(settings.SUI_GAME_ID),
                ],
            });

            const transaction = await executeSuiTransaction(
                client,
                keypair,
                tx
            );

            // Find and validate the UniquePlayerCount event
            const uniquePlayerEvent = transaction.events?.find((event) =>
                event.type.endsWith("::game_manager::UniquePlayerCountEvent")
            );

            if (!uniquePlayerEvent) {
                throw new Error(
                    "UniquePlayerCount event not found in transaction"
                );
            }

            // Validate and parse the event data
            const eventData = validateSuiEvent(
                uniquePlayerEvent.parsedJson,
                UniquePlayerCountEventSchema
            );

            const responseMessage = `Unique Player Count for Game ${settings.SUI_GAME_ID}:\n- Current Count: ${eventData.count}`;

            if (callback) {
                callback({
                    text: responseMessage,
                    content: {
                        transactionDigest: transaction.digest,
                        eventData: {
                            ...eventData,
                            game_id: settings.SUI_GAME_ID, // Include game ID in the response
                        },
                    },
                });
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Unknown error occurred";
            elizaLogger.error(
                "Error checking unique player count:",
                errorMessage
            );
            if (callback) {
                callback({
                    text: `Failed to check unique player count: ${errorMessage}`,
                    content: {
                        error: errorMessage,
                        details:
                            error instanceof Error ? error.stack : undefined,
                    },
                });
            }
        }
    },
    examples: checkUniquePlayerCountExample as ActionExample[][],
};
