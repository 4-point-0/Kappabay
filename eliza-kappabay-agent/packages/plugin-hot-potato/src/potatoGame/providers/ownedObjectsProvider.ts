import type { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import {
    GameCapSchema,
    HotPotatoSchema,
    ModelCapSchema,
    OwnedObjectsSchemaType,
    OwnedObjectsSchema,
} from "../types/types";
import { z } from "zod";

export const ownedObjectsProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State
    ): Promise<OwnedObjectsSchemaType> => {
        try {
            const network = runtime.getSetting("SUI_NETWORK") as
                | "mainnet"
                | "testnet"
                | "devnet";

            const packageId = runtime.getSetting("SUI_PACKAGE_ID");
            const secrets = JSON.parse((state as any).secrets);

            const suiClient = new SuiClient({
                url: getFullnodeUrl(network),
            });

            const ownedObjects = await suiClient.getOwnedObjects({
                owner: secrets.walletAddress,
                options: {
                    showType: true,
                    showDisplay: true,
                    showContent: true,
                },
            });

            const findAndValidateObject = <T extends z.ZodTypeAny>(
                schema: T
            ) => {
                const matchingObjects = ownedObjects.data.filter((obj) => {
                    if (schema instanceof z.ZodLiteral) {
                        return obj.data?.type?.includes(schema.value);
                    } else if (
                        schema instanceof z.ZodObject &&
                        schema.shape.type instanceof z.ZodLiteral
                    ) {
                        return obj.data?.type?.includes(
                            schema.shape.type.value
                        );
                    } else if (
                        schema instanceof z.ZodObject &&
                        schema.shape.type instanceof z.ZodOptional
                    ) {
                        return obj.data?.type !== undefined;
                    }
                    return false;
                });

                const sorted = matchingObjects.sort((a, b) => {
                    const timeA =
                        (a.data?.content as any)?.fields
                            ?.last_transfer_time_ms || 0;
                    const timeB =
                        (b.data?.content as any)?.fields
                            ?.last_transfer_time_ms || 0;
                    return timeB - timeA;
                });

                return sorted[0]?.data ? schema.parse(sorted[0].data) : null;
            };

            return OwnedObjectsSchema.parse({
                modalObject: findAndValidateObject(ModelCapSchema),
                hotPotatoObject: findAndValidateObject(HotPotatoSchema),
                gameCapObject: findAndValidateObject(GameCapSchema),
            });
        } catch (error) {
            console.error("Error checking owned objects:", error);
            return OwnedObjectsSchema.parse({
                modalObject: null,
                hotPotatoObject: null,
                gameCapObject: null,
            });
        }
    },
};
