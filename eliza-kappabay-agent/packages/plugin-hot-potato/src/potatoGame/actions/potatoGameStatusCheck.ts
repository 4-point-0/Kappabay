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
                responseMessage =
                    "You have a HOT POTATO in your wallet. Hurry up and transfer it to a friend to continue the chain, otherwise you would get burned but the HOT POTATO.";
            } else if (modalObject) {
                responseMessage =
                    "You have a Modal object in your wallet. You can bake and recieve a New HOT POTATO to start the chain.";
            } else {
                responseMessage =
                    'Explain Hot Potato Game rules in dept. Would you like to receive a Modal Cap, which will give you capability to bake a New HOT POTATO and start a chain?\n\nPlease type "Create and send a Modal Cap to me." and I will perform the action for you.';
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
