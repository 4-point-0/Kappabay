import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AgentConfig } from "./types";
import crypto from "crypto";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function serializeAgentConfig(config: AgentConfig): string {
	return JSON.stringify(config, null, 2);
}

export function deserializeAgentConfig(jsonString: string): AgentConfig {
	return JSON.parse(jsonString) as AgentConfig;
}

// -----------------
// Encryption Helpers
// -----------------

export function encrypt(text: string): string {
	const algorithm = "aes-256-cbc";

	const keyHex = process.env.ENCRYPTION_KEY;
	if (!keyHex) {
		throw new Error("ENCRYPTION_KEY environment variable not set.");
	}
	const key = Buffer.from(keyHex, "hex"); // Must be 32 bytes (64 hex characters)
	const iv = crypto.randomBytes(16); // Initialization vector (16 bytes)
	const cipher = crypto.createCipheriv(algorithm, key, iv);
	const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
	// Combine the IV with the encrypted text (separated by a colon)
	return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(text: string): string {
	const algorithm = "aes-256-cbc";
	const keyHex = process.env.ENCRYPTION_KEY;
	if (!keyHex) {
		throw new Error("ENCRYPTION_KEY environment variable not set.");
	}
	const key = Buffer.from(keyHex, "hex");
	const [ivHex, encryptedHex] = text.split(":");
	const iv = Buffer.from(ivHex, "hex");
	const encryptedText = Buffer.from(encryptedHex, "hex");
	const decipher = crypto.createDecipheriv(algorithm, key, iv);
	const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
	return decrypted.toString("utf8");
}

export const copyToClipboard = (text: string) => {
	navigator.clipboard
		.writeText(text)
		.then(() => {
			alert("ID copied to clipboard!");
		})
		.catch((err) => {
			console.error("Failed to copy: ", err);
		});
};
