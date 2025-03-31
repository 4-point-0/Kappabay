import {
    type Action,
    type ActionExample,
    type IAgentRuntime,
    type Memory,
    type State,
    type HandlerCallback,
    elizaLogger,
} from "@elizaos/core";

import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { bakeAndSendModalCapExample } from "../templates/examples";
import { ownedObjectsProvider } from "../providers/ownedObjectsProvider";
import { OwnedObjectsSchemaType } from "../types/types";
import {
    executeSuiTransaction,
    getConfigFromState,
    getKeypair,
    getSuiClient,
    validateSuiSettings,
} from "../utils/utils";

const SUI_MODULE_NAME = "hot_potato";
const SUI_FUNCTION_NAME = "create_model_cap";

export const createAndSendModalCap: Action = {
    name: "CREATE_AND_SEND_MODAL_CAP",
    similes: [
        "CREATE_MODAL_CAP",
        "SEND_MODAL_CAP",
        "CREATE_AND_SEND",
        "MODAL_CAP",
        "CREATE_CAP",
        "SEND_CAP",
    ],
    description: "Create and Send Modal Cap",
    suppressInitialMessage: true,
    validate: async () => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: Record<string, unknown>,
        callback?: HandlerCallback
    ) => {
        try {
            const secrets = getConfigFromState(state);
            const settings = validateSuiSettings(runtime, [
                "SUI_PRIVATE_KEY",
                "SUI_NETWORK",
                "SUI_PACKAGE_ID",
            ]);

            const { modalObject } = (await ownedObjectsProvider.get(
                runtime,
                message,
                state
            )) as OwnedObjectsSchemaType;

            if (modalObject) {
                if (callback) {
                    callback({
                        text: `You already have a Modal Cap object. You can bake and recieve a New HOT POTATO to start the chain.`,
                        content: {},
                    });
                }
                return;
            }

            const client = getSuiClient(settings.SUI_NETWORK);
            const keypair = getKeypair(settings.SUI_PRIVATE_KEY);

            const tx = new Transaction();

            tx.setGasBudget(20_000_000);
            tx.moveCall({
                target: `${settings.SUI_PACKAGE_ID}::${SUI_MODULE_NAME}::${SUI_FUNCTION_NAME}`,
                arguments: [
                    tx.pure.address(secrets.walletAddress),
                    tx.object("0x6"), // Clock object
                ],
            });

            const transaction = await executeSuiTransaction(
                client,
                keypair,
                tx
            );
            const responseMessage = `Successfully created modal cap for ${secrets.walletAddress}. TX: ${transaction.digest}`;

            if (callback) {
                callback({ text: responseMessage, content: {} });
            }
        } catch (error) {
            console.log("error", error);

            elizaLogger.error("Error processing action:", error);
            if (callback) {
                callback(error, null);
            }
        }
    },
    examples: bakeAndSendModalCapExample as ActionExample[][],
};
