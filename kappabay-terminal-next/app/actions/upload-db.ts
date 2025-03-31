"use server";

import { getBlobHash, setBlobHash, deleteBlobHash, setDbFile } from "../../lib/simpleDb";
import { uploadBlob, deleteBlob } from "../../lib/walrusApi";

/**
 * Server Action to upload db.sqlite to Walrus.
 * @param agentId - The agent identifier.
 * @param file - The db.sqlite file to upload.
 * @returns An object containing the state and the new blob hash.
 */
export async function uploadDb(agentId: string, file: File): Promise<{ state: string; blobHash: string }> {
	try {
		console.log("in uploadDb");

		// Convert File to buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		console.log("before getBlobHash");
		// Check for existing blob hash
		const existingBlobHash = await getBlobHash(agentId);

		if (existingBlobHash) {
			// Delete the existing blob from Walrus
			await deleteBlob(existingBlobHash);
			await deleteBlobHash(agentId);
		}
		console.log("before uploadBlob");

		// Upload the new db.sqlite buffer to Walrus using the buffer
		const newBlobHash = await uploadBlob(buffer, undefined);

		// Cache the db.sqlite file buffer in node-cache
		await setDbFile(agentId, buffer);

		// Save the new blob hash in simpleDb
		await setBlobHash(agentId, newBlobHash);

		return { state: "success", blobHash: newBlobHash };
	} catch (error) {
		console.error("Upload error:", error);
		throw new Error("Failed to upload the db.sqlite file.");
	}
}
