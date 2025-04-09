import {
    type Action,
    type ActionExample,
    type IAgentRuntime,
    type Memory,
    type State,
    type HandlerCallback,
    elizaLogger,
} from "@elizaos/core";

// Import SUI SDK or relevant library for blockchain interactions
import { potatoGameStatusCheckExample } from "../templates/examples";
import { ownedObjectsProvider } from "../providers/ownedObjectsProvider";
import { OwnedObjectsSchemaType } from "../types/types";

export const potatoGameStatusCheck: Action = {
    name: "CHECK_HOT_POTATO_GAME_STATUS",
    similes: [
        "CHECK_POTATO",
        "CHECK_HOT_POTATO",
        "CHECK_HOT_POTATO_GAME",
        "HOT_POTATO",
        "GAME_STATUS",
        "GAME",
        "POTATO",
    ],
    description: "Check the status of the Hot Potato game",
    suppressInitialMessage: true,
    validate: async () => true, // Public endpoint
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: Record<string, unknown>,
        callback?: HandlerCallback
    ) => {
        const secrets = JSON.parse((state as any).secrets);
        const walletAddress = secrets.walletAddress;

        if (!walletAddress) {
            elizaLogger.error("No wallet address found in state secrets.");
            return;
        }

        try {
            const { gameCapObject, hotPotatoObject, modalObject } =
                (await ownedObjectsProvider.get(
                    runtime,
                    message,
                    state
                )) as OwnedObjectsSchemaType;

            let responseMessage = "";
            if (hotPotatoObject && gameCapObject) {
                responseMessage = "You have a HOT POTATO in your wallet.";
                if (hotPotatoObject.display?.data?.time_remaining) {
                    const timestampMatch =
                        hotPotatoObject.display?.data?.time_remaining?.match(
                            /\d+/
                        );

                    if (timestampMatch) {
                        const expirationTimestamp = parseInt(
                            timestampMatch[0],
                            10
                        );
                        const currentTimestamp = Date.now();

                        if (currentTimestamp > expirationTimestamp) {
                            responseMessage += `\nThe potato has expired!\n(Expired at ${new Date(
                                expirationTimestamp
                            ).toLocaleString()})`;
                        } else {
                            const timeLeftMs =
                                expirationTimestamp - currentTimestamp;
                            const timeLeftSeconds = Math.floor(
                                timeLeftMs / 1000
                            );
                            const timeLeftMinutes = Math.floor(
                                timeLeftSeconds / 60
                            );
                            const hours = Math.floor(timeLeftMinutes / 60);
                            const minutes = timeLeftMinutes % 60;
                            const seconds = timeLeftSeconds % 60;

                            responseMessage += `\nThe potato is still hot!\nTime remaining: ${hours}h ${minutes}m ${seconds}s (Expires at ${new Date(
                                expirationTimestamp
                            ).toLocaleString()})`;
                        }
                    }
                }
            } else if (modalObject) {
                responseMessage =
                    "You have a Modal object in your wallet.\nYou can bake and recieve a New HOT POTATO to start the chain.";
            } else {
                responseMessage =
                    'Explain Hot Potato Game rules in dept.\nWould you like to receive a Modal Cap, which will give you capability to bake a New HOT POTATO and start a chain?\n\nPlease type \n\n"Create and send a Modal Cap to me."\n\n and I will perform the action for you.';
            }

            if (callback) {
                callback({ text: responseMessage, content: {} }); // Return response via the callback function
            } else {
                elizaLogger.warn("Callback function not provided.");
            }
        } catch (error) {
            elizaLogger.error("Error processing action:", error);
            if (callback) {
                callback(error, null); // Return error via the callback function
            }
        }
    },
    examples: potatoGameStatusCheckExample as ActionExample[][], // Provide action examples if needed
};
