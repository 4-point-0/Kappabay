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
import { GameTransferCountEventSchema } from "../types/types";
import { checkGameTransferCountExample } from "../templates/examples";

const SUI_MODULE_NAME = "game_manager";
const SUI_FUNCTION_NAME = "check_game_transfer_count";

export const checkGameTransferCount: Action = {
    name: "CHECK_GAME_TRANSFER_COUNT",
    similes: [
        "GET_TRANSFER_COUNT",
        "CHECK_TRANSFERS",
        "GAME_TRANSFERS",
        "TRANSFER_STATS",
        "GET_GAME_TRANSFERS",
    ],
    description: "Check the total number of transfers for a specific game",
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

            // Find and validate the GameTransferCount event
            const transferCountEvent = transaction.events?.find((event) =>
                event.type.endsWith("::game_manager::GameTransferCountEvent")
            );

            if (!transferCountEvent) {
                throw new Error(
                    "GameTransferCount event not found in transaction"
                );
            }

            // Validate and parse the event data
            const eventData = validateSuiEvent(
                transferCountEvent.parsedJson,
                GameTransferCountEventSchema
            );

            const responseMessage = `Game Transfer Count for Game ${eventData.game_id}:\n- Total Transfers: ${eventData.count}`;

            if (callback) {
                callback({
                    text: responseMessage,
                    content: {
                        transactionDigest: transaction.digest,
                        eventData: {
                            ...eventData,
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
                "Error checking game transfer count:",
                errorMessage
            );
            if (callback) {
                callback({
                    text: `Failed to check game transfer count: ${errorMessage}`,
                    content: {
                        error: errorMessage,
                        details:
                            error instanceof Error ? error.stack : undefined,
                    },
                });
            }
        }
    },
    examples: checkGameTransferCountExample as ActionExample[][],
};
