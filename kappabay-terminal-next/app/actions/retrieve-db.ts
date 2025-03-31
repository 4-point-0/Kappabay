"use server";

import { getBlobHash } from "../../lib/simpleDb";

/**
 * Server Action to retrieve the blob hash for a given agentId.
 * @param agentId - The agent identifier.
 * @returns The blob hash associated with the agentId.
 */
export async function retrieveDb(agentId: string): Promise<{ blobHash: string }> {
	try {
		const blobHash = await getBlobHash(agentId);

		if (!blobHash) {
			throw new Error("Blob hash not found for the provided agentId.");
		}

		return { blobHash };
	} catch (error) {
		console.error("Retrieve error:", error);
		throw new Error("Failed to retrieve the blob hash.");
	}
}
