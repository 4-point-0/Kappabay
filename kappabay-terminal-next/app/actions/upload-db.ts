"use server";

import { getBlobHash, setBlobHash, deleteBlobHash } from "../../lib/simpleDb";
import { uploadBlob, deleteBlob } from "../../lib/walrusApi";
import fs from "fs/promises";

/**
 * Server Action to upload db.sqlite to Walrus.
 * @param agentId - The agent identifier.
 * @param file - The db.sqlite file to upload.
 * @returns An object containing the state and the new blob hash.
 */
export async function uploadDb(agentId: string, file: File): Promise<{ state: string; blobHash: string }> {
	try {
		// Convert File to buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Save the file temporarily
		const tempFilePath = `/tmp/${agentId}_db.sqlite`;
		await fs.writeFile(tempFilePath, buffer);

		// Check for existing blob hash
		const existingBlobHash = await getBlobHash(agentId);

		if (existingBlobHash) {
			// Delete the existing blob from Walrus
			await deleteBlob(existingBlobHash);
			await deleteBlobHash(agentId);
		}

		// Upload the new db.sqlite file to Walrus
		const newBlobHash = await uploadBlob(tempFilePath, undefined);

		// Save the new blob hash in simpleDb
		await setBlobHash(agentId, newBlobHash);

		// Clean up the temporary file
		await fs.unlink(tempFilePath);

		return { state: "success", blobHash: newBlobHash };
	} catch (error) {
		console.error("Upload error:", error);
		throw new Error("Failed to upload the db.sqlite file.");
	}
}
