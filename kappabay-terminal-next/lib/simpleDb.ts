import { supabase } from "./supabaseClient";
import { Buffer } from "buffer";
import NodeCache from "node-cache";

const cache = new NodeCache();

export const getBlobHash = async (agentId: string): Promise<string | null> => {
	console.log("in getBlobHash");

	// Check cache first
	const cachedHash = cache.get<string>(agentId);
	if (cachedHash) {
		return cachedHash;
	}

	console.log('before supabase.from("db_hashes") ');

	// Fetch from Supabase
	const { data, error } = await supabase.from("db_hashes").select("blob_hash").eq("agent_id", agentId).single();
	console.log('after supabase.from("db_hashes") ');
	if (error) {
		if (error.code === "PGRST116") return null; // No data found
		throw error;
	}

	// Store in cache
	cache.set(agentId, data.blob_hash);

	return data.blob_hash;
};

export const setBlobHash = async (agentId: string, blobHash: string): Promise<void> => {
	console.log("agentId", agentId);
	console.log("blobHash", blobHash);

	const { error } = await supabase
		.from("db_hashes")
		.upsert({ agent_id: agentId, blob_hash: blobHash }, { onConflict: "agent_id" });

	if (error) {
		throw error;
	}

	// Update cache
	cache.set(agentId, blobHash);
};

export const deleteBlobHash = async (agentId: string): Promise<void> => {
	const { error } = await supabase.from("db_hashes").delete().eq("agent_id", agentId);

	if (error) {
		throw error;
	}

	// Remove from cache
	cache.del(agentId);
};
export const setDbFile = async (agentId: string, buffer: Buffer): Promise<void> => {
	// Store the Buffer directly
	cache.set(`dbFile_${agentId}`, buffer);
};

export const getDbFile = async (agentId: string): Promise<Buffer | null> => {
	const cachedBuffer = cache.get<Buffer>(`dbFile_${agentId}`);
	return cachedBuffer || null;
};

export const deleteDbFile = async (agentId: string): Promise<void> => {
	cache.del(`dbFile_${agentId}`);
};
