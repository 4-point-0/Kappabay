import { z } from "zod";

// Base schema for SUI object data
export const SuiObjectDataSchema = z.object({
    objectId: z.string(),
    version: z.string(),
    digest: z.string(),
    type: z.string().optional(),
    // Add other fields you need from the object data
});

// Schema for each specific object type
export const ModelCapSchema = SuiObjectDataSchema.extend({
    type: z.literal(
        "0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6::hot_potato::ModelCap"
    ),
    // Add ModelCap specific fields if any
});

export const HotPotatoSchema = SuiObjectDataSchema.extend({
    type: z.literal(
        "0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6::hot_potato::HotPotato"
    ),
    display: z.object({
        data: z.object({
            description: z.string(),
            flavor: z.string(),
            image_url: z.string(),
            name: z.string(),
            potato_type: z.string(),
            temperature: z.string(),
            time_remaining: z.string(),
        }),
    }),
    // Add HotPotato specific fields if any
});

export const GameCapSchema = SuiObjectDataSchema.extend({
    type: z.literal(
        "0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6::hot_potato::GameCap"
    ),
    // Add GameCap specific fields if any
});

// Main response schema
export const OwnedObjectsSchema = z.object({
    modalObject: ModelCapSchema.nullable(),
    hotPotatoObject: HotPotatoSchema.nullable(),
    gameCapObject: GameCapSchema.nullable(),
});

export type OwnedObjectsSchemaType = z.infer<typeof OwnedObjectsSchema>;

export const UniquePlayerCountEventSchema = z.object({
    count: z.string(),
    game_id: z.string().optional(), // Optional as it might not be in all events
});

export type UniquePlayerCountEvent = z.infer<
    typeof UniquePlayerCountEventSchema
>;

export const GameTransferCountEventSchema = UniquePlayerCountEventSchema;
export type GameTransferCountEvent = UniquePlayerCountEvent;
