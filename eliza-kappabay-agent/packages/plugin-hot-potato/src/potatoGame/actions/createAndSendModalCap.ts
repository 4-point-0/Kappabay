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

const SUI_PACKAGE_ID =
    "0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6";
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
            const secrets = JSON.parse((state as any).secrets);
            const walletAddress = secrets.walletAddress;
            const suiPrivateKey = runtime.getSetting("SUI_PRIVATE_KEY");
            const network = runtime.getSetting("SUI_NETWORK") as
                | "mainnet"
                | "testnet"
                | "devnet";

            if (!suiPrivateKey) {
                elizaLogger.error(
                    "SUI private key not found in environment variables."
                );
                return;
            }

            if (!walletAddress) {
                elizaLogger.error("No wallet address found in state secrets.");
                return;
            }

            if (!network) {
                elizaLogger.error(
                    "SUI network not found in environment variables."
                );
                return;
            }
            const { modalObject } = (await ownedObjectsProvider.get(
                runtime,
                message,
                state
            )) as OwnedObjectsSchemaType;

            if (modalObject) {
                callback({
                    text: `You already have a Modal Cap object. You can bake and recieve a New HOT POTATO to start the chain.`,
                    content: {},
                });
                return;
            }
            const client = new SuiClient({ url: getFullnodeUrl(network) });
            const keypair = Ed25519Keypair.fromSecretKey(suiPrivateKey);
            const tx = new Transaction();
            tx.setGasBudget(20_000_000);
            tx.moveCall({
                target: `${SUI_PACKAGE_ID}::${SUI_MODULE_NAME}::${SUI_FUNCTION_NAME}`,
                arguments: [
                    tx.pure.address(walletAddress), // Properly encode address argument
                    tx.object("0x6"), // Clock object
                ],
            });
            const result = await client.signAndExecuteTransaction({
                transaction: tx,
                signer: keypair,
                options: {
                    showEffects: true,
                    showInput: true,
                },
            });
            const transaction = await client.waitForTransaction({
                digest: result.digest,
                options: { showEffects: true },
            });

            const responseMessage = `Successfully created modal cap for ${walletAddress}. TX: ${transaction.digest}`;
            elizaLogger.info(responseMessage);

            if (callback) {
                callback({ text: responseMessage, content: {} });
            } else {
                elizaLogger.warn("Callback function not provided.");
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
