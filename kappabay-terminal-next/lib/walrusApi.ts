import axios from "axios";

const WALRUS_PUBLISHER_URL = process.env.WALRUS_PUBLISHER_URL!;
const WALRUS_AGGREGATOR_URL = process.env.WALRUS_AGGREGATOR_URL!;

/**
 * Uploads a blob to Walrus Publisher.
 * @param filePath Path to the db.sqlite file.
 * @param sendObjectTo Optional address to transfer the blob object.
 * @returns The new blob hash.
 */
export const uploadBlob = async (buffer: Buffer, sendObjectTo?: string): Promise<string> => {
	const url = `${WALRUS_PUBLISHER_URL}/v1/blobs`;
	const params: any = {
		deletable: true,
		epochs: 10,
	};

	if (sendObjectTo) {
		params.send_object_to = sendObjectTo;
	}

	// Set the appropriate headers
	const headers = {
		"Content-Type": "application/vnd.sqlite3", // Specify the file type
		"Content-Length": buffer.length.toString(), // Specify the content length
	};

	console.log("before axios.put");
	// Send the PUT request with the buffer as the body
	const response = await axios.put(url, buffer, { headers, params });
	console.log("after axios.put");

	if (response.data.newlyCreated) {
		return response.data.newlyCreated.blobObject.blobId;
	} else if (response.data.alreadyCertified) {
		return response.data.alreadyCertified.blobId;
	} else {
		throw new Error("Unexpected response from Walrus Publisher.");
	}
};

/**
 * Deletes a blob from Walrus (assuming Walrus API supports deletion).
 * @param blobHash The hash of the blob to delete.
 */
export const deleteBlob = async (blobHash: string): Promise<void> => {
	// Assuming Walrus has a DELETE endpoint for blobs
	const url = `${WALRUS_PUBLISHER_URL}/v1/blobs/${blobHash}`;

	await axios.delete(url);
};

/**
 * Retrieves a blob hash from Walrus Aggregator.
 * @param blobHash The hash of the blob to retrieve.
 * @returns The blob content.
 */
export const retrieveBlob = async (blobHash: string): Promise<Buffer> => {
	const url = `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobHash}`;
	const response = await axios.get(url, { responseType: "arraybuffer" });
	return Buffer.from(response.data);
};
