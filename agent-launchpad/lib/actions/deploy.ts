"use server";

import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db";
import * as net from "net";
import { DeployOracle } from "./deploy-oracle";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { DeploymentData } from "../types";

/**
 * Creates a Docker secret from the .env content.
 * @param agentId A unique identifier for this agent
 * @param envContent The content of the .env file
 * @returns A promise resolving to the Docker secret name
 */
async function createDockerSecretFromEnv(agentId: string, envContent: string): Promise<string> {
	const tmpDir = os.tmpdir();
	const envFilePath = path.join(tmpDir, `env_${agentId}.env`);
	await fs.writeFile(envFilePath, envContent, { encoding: "utf8" });
	const secretName = `env_secret_${agentId}`;
	await new Promise<void>((resolve, reject) => {
		exec(`docker secret create ${secretName} ${envFilePath}`, (error, stdout, stderr) => {
			if (error) {
				console.error("Docker secret creation error:", stderr);
				reject(error);
				return;
			}
			resolve();
		});
	});
	await fs.unlink(envFilePath); // Clean up the temporary file
	return secretName;
}

// -----------------
// Encryption Helpers
// -----------------

function encrypt(text: string): string {
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

function decrypt(text: string): string {
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

// -----------------
// Docker Config for Agent JSON
// -----------------

/**
 * Creates a Docker config from the agent configuration.
 * The config will be mounted inside the container at /characters/agent.json.
 * @param agentId A unique identifier for this agent
 * @param agentConfig The agent configuration object
 * @returns A promise resolving to the Docker config name
 */
async function createDockerConfigFromAgentConfig(agentId: string, agentConfig: any): Promise<string> {
	const tmpDir = os.tmpdir();
	const configFilePath = path.join(tmpDir, `agentconfig_${agentId}.json`);
	const configContent = JSON.stringify(agentConfig, null, 2);
	await fs.writeFile(configFilePath, configContent, { encoding: "utf8" });
	const configName = `agent_config_${agentId}`;
	await new Promise<void>((resolve, reject) => {
		exec(`docker config create ${configName} ${configFilePath}`, (error, stdout, stderr) => {
			if (error) {
				console.error("Docker config creation error:", stderr);
				reject(error);
				return;
			}
			resolve();
		});
	});
	await fs.unlink(configFilePath); // Clean up the temporary file
	return configName;
}

// -----------------
// Port Discovery Helper
// -----------------

async function findAvailablePort(start: number, end: number): Promise<number> {
	for (let port = start; port <= end; port++) {
		try {
			const inUse = await new Promise<boolean>((resolve) => {
				const server = net
					.createServer()
					.once("error", (err: any) => {
						resolve(err.code === "EADDRINUSE");
					})
					.once("listening", () => {
						server.close();
						resolve(false);
					})
					.listen(port);
			});
			if (!inUse) {
				const existingAgent = await prisma.agent.findFirst({ where: { port } });
				if (!existingAgent) {
					return port;
				}
			}
		} catch (error) {
			console.log(error);
			continue;
		}
	}
	throw new Error(`No available ports found between ${start} and ${end}`);
}

// -----------------
// Docker Service Deployment
// -----------------

/**
 * Builds and starts the agent as a Docker service using pre-built images.
 * This deploys the container as a Docker service (Swarm mode) and injects both:
 *   - A Docker secret for the wallet key (mounted at /run/secrets/WALLET_KEY)
 *   - A Docker config for agent.json (mounted at /characters/agent.json)
 * @param agentId The unique agent identifier
 * @param walletKey The plain wallet key
 * @param configName The name of the Docker config for agent.json
 * @returns A promise resolving to deployment info, including host ports and service ID.
 */
async function buildAndStartAgentDocker(
	agentId: string,
	walletKey: string,
	configName: string,
	envContent: string // Add this parameter
): Promise<{ port: number; portTerminal: number; serviceId: string }> {
	// Assign available host ports for the container mappings.
	const hostPortAPI = await findAvailablePort(3000, 5000);
	const hostPortTerminal = await findAvailablePort(7000, 9000);

	// Pre-built Docker image from your registry.
	const AGENT_IMAGE = process.env.AGENT_IMAGE || "myregistry/agent:latest";

	// ----- Create the Docker secret for the wallet key -----
	// Write the wallet key to a temporary file.
	const tmpDir = os.tmpdir();
	const secretFilePath = path.join(tmpDir, `walletkey_${agentId}.txt`);
	await fs.writeFile(secretFilePath, walletKey, { encoding: "utf8" });
	const secretName = `wallet_key_${agentId}`;
	console.log("Creating Secret.");
	await new Promise<void>((resolve, reject) => {
		exec(`docker secret create ${secretName} ${secretFilePath}`, (error, stdout, stderr) => {
			if (error) {
				console.error("Docker secret creation error:", stderr);
				reject(error);
				return;
			}
			resolve();
		});
	});
	await fs.unlink(secretFilePath); // Remove temporary file
	console.log("Created secret, deleted temp file.");
	// Create the Docker secret for the .env file
	const envSecretName = await createDockerSecretFromEnv(agentId, envContent);

	// ----- Create the Docker service with port mappings, secrets, and config -----
	// The Docker config will be mounted at /characters/agent.json,
	// and the Docker secret will be available at /run/secrets/WALLET_KEY.
	console.log("Creating service command:");
	const serviceCreateCmd =
		`docker service create --name agent-${agentId} ` +
		`--publish published=${hostPortAPI},target=3000 ` +
		`--publish published=${hostPortTerminal},target=7000 ` +
		`--secret source=${secretName},target=WALLET_KEY ` +
		`--secret source=${envSecretName},target=/app/.env ` +
		`--config source=${configName},target=/characters/agent.json ` +
		`-e SERVER_PORT=3000 -e CLIENT_PORT=7000 ` +
		`${AGENT_IMAGE}`;
	console.log(serviceCreateCmd);
	console.log("Launching service");
	const serviceId: string = await new Promise((resolve, reject) => {
		exec(serviceCreateCmd, (error, stdout, stderr) => {
			if (error) {
				console.error("Docker service creation error:", stderr);
				reject(error);
				return;
			}
			resolve(stdout.trim());
		});
	});
	console.log("Service created.");

	return { port: hostPortAPI, portTerminal: hostPortTerminal, serviceId };
}

// -----------------
// Main Deployment Function
// -----------------

export async function Deploy(deploymentData: DeploymentData) {
	try {
		// Generate a unique ID for the agent.
		const agentId = uuidv4();

		// Create the Docker config for the agent.json configuration.
		console.log("Creating config");
		const configName = await createDockerConfigFromAgentConfig(agentId, deploymentData.agentConfig);
		console.log("Config Created.");
		// Generate a new wallet for the agent.
		const agentKeypair = Ed25519Keypair.generate();
		const agentWalletAddress = agentKeypair.getPublicKey().toSuiAddress();
		const agentWalletKey = agentKeypair.getSecretKey();

		// Encrypt the wallet key for storage.
		const encryptedWalletKey = encrypt(agentWalletKey);

		// Build and start the agent container via Docker using Docker secrets and configs.
		console.log("Awaiting docker deployment.");
		const { port, portTerminal, serviceId } = await buildAndStartAgentDocker(
			agentId,
			agentWalletKey,
			configName,
			deploymentData.envContent // Pass the .env content
		);

		// Create the database record with the deployment information.
		console.log("Writing to DB");
		const agent = await prisma.agent.create({
			data: {
				id: agentId,
				name: deploymentData.agentConfig.name,
				objectId: deploymentData.onChainData.agentObjectId,
				capId: deploymentData.onChainData.agentCapId,
				ownerWallet: deploymentData.onChainData.ownerWallet,
				txDigest: deploymentData.onChainData.txDigest,
				config: deploymentData.agentConfig as any,
				status: "ACTIVE",
				agentWalletAddress,
				agentWalletKey: encryptedWalletKey, // Stored in encrypted form
				port, // Host port mapped to the API
				dockerServiceId: serviceId, // Storing the Docker service ID
				oraclePort: 0, // For now
			},
		});

		const agentUrl = `http://localhost:${portTerminal}`;
		const apiAgentUrl = `http://localhost:${port}`;

		// Deploy the Oracle using the separate function.
		try {
			const oracleResult = await DeployOracle(
				agentId,
				apiAgentUrl,
				agentWalletKey // Pass the plain wallet key for oracle setup
			);

			return {
				success: true,
				agentId: agent.id,
				agentWallet: agentWalletAddress,
				port,
				agentUrl,
				oracle: oracleResult,
			};
		} catch (oracleError) {
			console.error("Oracle deployment failed:", oracleError);
			return {
				success: true,
				agentId: agent.id,
				agentWallet: agentWalletAddress,
				port,
				agentUrl,
				oracle: {
					success: false,
					error: oracleError instanceof Error ? oracleError.message : "Unknown error during oracle deployment",
				},
			};
		}
	} catch (error) {
		console.error("Agent backend deployment failed:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
