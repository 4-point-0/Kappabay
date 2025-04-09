"use client";

import { useState } from "react";
import { uploadDb } from "@/app/actions/upload-db";

const UploadDb = () => {
	const [agentId, setAgentId] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [status, setStatus] = useState<string>("");
	const [blobHash, setBlobHash] = useState<string>("");

	const handleUpload = async () => {
		if (!agentId || !file) {
			setStatus("Agent ID and db.sqlite file are required.");
			return;
		}

		setStatus("Uploading...");

		try {
			console.log("before");

			// Read the file as an ArrayBuffer
			const arrayBuffer = await file.arrayBuffer();

			// Convert ArrayBuffer to an array of numbers
			const bufferArray = Array.from(new Uint8Array(arrayBuffer));

			// Pass the serialized buffer to the Server Action
			const result = await uploadDb(agentId, bufferArray);
			console.log("after");
			setBlobHash(result.blobHash);
			setStatus("Upload successful!");
		} catch (error) {
			console.log("error", error);

			console.error("Upload error:", error);
			setStatus("An unexpected error occurred.");
		}
	};

	return (
		<div>
			<h2>Upload db.sqlite to Walrus</h2>
			<input type="text" placeholder="Agent ID" value={agentId} onChange={(e) => setAgentId(e.target.value)} />
			<input type="file" accept=".sqlite" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
			<button onClick={handleUpload}>Upload</button>
			<p>{status}</p>
			{blobHash && <p>Blob Hash: {blobHash}</p>}
		</div>
	);
};

export default UploadDb;
