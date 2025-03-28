import { z } from "zod";

export const MiddlewareSchema = z.object({
    agentName: z.string(),
    apiKey: z.string(),
    targetUrl: z.string(),
});

// Inferred types from schemas
export type MiddlewareSchemaTypes = z.infer<typeof MiddlewareSchema>;
