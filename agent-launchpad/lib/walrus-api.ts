const WALRUS_PUBLISHER_URL = process.env.WALRUS_PUBLISHER_URL!;
const WALRUS_AGGREGATOR_URL = process.env.WALRUS_AGGREGATOR_URL!;

/**
 * Upload a text blob (e.g. .txt/.md) to Walrus Publisher.
 */
export const uploadTextBlob = async (
  buffer: Buffer,
  sendObjectTo?: string
): Promise<string> => {
  const url = `${WALRUS_PUBLISHER_URL}/v1/blobs`;
  const params: any = { deletable: true };
  if (sendObjectTo) params.send_object_to = sendObjectTo;
  const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;

  const headers = {
    "Content-Type": "text/plain",
    "Content-Length": buffer.length.toString(),
  };

  const response = await fetch(fullUrl, {
    method: "PUT",
    headers,
    body: buffer,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Walrus text upload failed: ${err.message || response.statusText}`);
  }
  const data = await response.json();
  // newlyCreated or alreadyCertified
  return data.newlyCreated?.blobObject.blobId ?? data.alreadyCertified?.blobId;
};

/**
 * Delete a previously‐created blob.
 */
export const deleteBlob = async (blobId: string): Promise<void> => {
  const url = `${WALRUS_PUBLISHER_URL}/v1/blobs/${encodeURIComponent(blobId)}`;
  const resp = await fetch(url, { method: "DELETE" });
  if (!resp.ok) {
    throw new Error(`Walrus deleteBlob ${blobId} failed: ${resp.statusText}`);
  }
};

/**
 * Uploads a blob to Walrus Publisher.
 * @param filePath Path to the db.sqlite file.
 * @param sendObjectTo Optional address to transfer the blob object.
 * @returns The new blob hash.
 */
export const uploadBlob = async (buffer: Buffer, sendObjectTo?: string): Promise<string> => {
	const url = `${WALRUS_PUBLISHER_URL}/v1/blobs`;

	// Prepare query parameters
	const params: any = {
		deletable: true,
		// epochs: 10,
	};

	if (sendObjectTo) {
		params.send_object_to = sendObjectTo;
	}

	const queryString = new URLSearchParams(params).toString();
	const fullUrl = `${url}?${queryString}`;

	// Set the appropriate headers
	const headers = {
		"Content-Type": "application/vnd.sqlite3",
		"Content-Length": buffer.length.toString(),
	};

	// Send the PUT request using fetch with the buffer as the body
	const response = await fetch(fullUrl, {
		method: "PUT",
		headers,
		body: buffer,
	});

	if (!response.ok) {
		const errorData = await response.json();
		console.error("Walrus API upload error:", errorData);
		throw new Error(`Failed to upload blob: ${errorData.message || response.statusText}`);
	}

	const data = await response.json();
	if (data.newlyCreated) {
		return data.newlyCreated.blobObject.blobId;
	} else if (data.alreadyCertified) {
		return data.alreadyCertified.blobId;
	} else {
		throw new Error("Unexpected response from Walrus Publisher.");
	}
};

/**
 * Retrieves a blob hash from Walrus Aggregator.
 * @param blobHash The hash of the blob to retrieve.
 * @returns The blob content.
 */
export const retrieveBlob = async (blobHash: string): Promise<Buffer> => {
	const url = `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobHash}`;
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to retrieve blob: ${response.statusText}`);
	}

	const arrayBuffer = await response.arrayBuffer();
	return Buffer.from(arrayBuffer);
};
