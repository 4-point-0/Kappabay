import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { elizaLogger, type State, IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

export interface SuiTransactionOptions {
    showEffects?: boolean;
    showEvents?: boolean;
    showInput?: boolean;
}

export const getSuiClient = (network: string) => {
    if (
        network !== "devnet" &&
        network !== "testnet" &&
        network !== "mainnet"
    ) {
        throw new Error("Invalid SUI network");
    }
    return new SuiClient({ url: getFullnodeUrl(network) });
};

export const getKeypair = (privateKey: string) => {
    return Ed25519Keypair.fromSecretKey(privateKey);
};

export const executeSuiTransaction = async (
    client: SuiClient,
    keypair: Ed25519Keypair,
    tx: Transaction,
    options: SuiTransactionOptions = {}
) => {
    try {
        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: {
                showEffects: true,
                showEvents: true,
                showInput: true,
                ...options,
            },
        });

        return await client.waitForTransaction({
            digest: result.digest,
            options: {
                showEffects: true,
                showEvents: true,
                ...options,
            },
        });
    } catch (error) {
        elizaLogger.error("Error executing Sui transaction:", error);
        throw error;
    }
};

export const getConfigFromState = (state: State) => {
    try {
        return JSON.parse((state as any).secrets);
    } catch (error) {
        elizaLogger.error("Error parsing state secrets:", error);
        throw new Error("Invalid state secrets configuration");
    }
};

export const validateSuiEvent = <T extends z.ZodTypeAny>(
    event: unknown,
    schema: T
): z.infer<T> => {
    try {
        return schema.parse(event);
    } catch (error) {
        if (error instanceof z.ZodError) {
            elizaLogger.error("Event validation failed:", error.errors);
        }
        throw new Error("Invalid event data format");
    }
};

/**
 * Validates that a runtime setting exists and is not empty
 * @throws Error with descriptive message if setting is missing or empty
 */
export function validateRuntimeSetting(
    runtime: IAgentRuntime,
    settingName: string
): string {
    const value = runtime.getSetting(settingName);

    if (value === undefined || value === null || value === "") {
        const errorMessage = `Required setting '${settingName}' is missing or empty`;
        elizaLogger.error(errorMessage);
        throw new Error(errorMessage);
    }

    return String(value); // Ensure we return a string
}

/**
 * Validates multiple runtime settings at once
 * @returns Object with validated settings
 * @throws Error with first missing setting encountered
 */
export function validateRuntimeSettings<T extends string>(
    runtime: IAgentRuntime,
    settings: T[]
): Record<T, string> {
    const result: Partial<Record<T, string>> = {};

    for (const setting of settings) {
        result[setting] = validateRuntimeSetting(runtime, setting);
    }

    return result as Record<T, string>;
}

// Type-safe version for known setting names
export const SUI_SETTING_NAMES = [
    "SUI_PRIVATE_KEY",
    "SUI_NETWORK",
    "SUI_PACKAGE_ID",
    "SUI_GAME_MANAGER_ID",
    "SUI_GAME_ID",
] as const;

export type SuiSettingName = (typeof SUI_SETTING_NAMES)[number];

export function validateSuiSettings(
    runtime: IAgentRuntime,
    requiredSettings: SuiSettingName[]
): Record<SuiSettingName, string> {
    return validateRuntimeSettings(runtime, requiredSettings);
}
