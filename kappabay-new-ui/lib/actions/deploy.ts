"use server";

import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db";
import * as net from "net";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { DeploymentData } from "../types";
import { encrypt, ngrokAbsolutePath } from "../utils";
import ngrok from "ngrok";

/**
 * Creates a Docker secret from the .env content.
 * @param agentId A unique identifier for this agent
 * @param envContent The content of the .env file
 * @param secretName The name of the Docker secret
 * @returns A promise resolving to the Docker secret name
 */
async function createDockerSecretFromEnv(agentId: string, envContent: string, secretName: string): Promise<string> {
	const tmpDir = os.tmpdir();
	const envFilePath = secretName
		? path.join(tmpDir, `${secretName}.env`)
		: path.join(tmpDir, `${`env_${agentId}`}.env`);
	await fs.writeFile(envFilePath, envContent, { encoding: "utf8" });
	const _secretName = secretName ?? `env_secret_${agentId}`;
	await new Promise<void>((resolve, reject) => {
		exec(`docker secret create ${_secretName} ${envFilePath}`, (error, stdout, stderr) => {
			if (error) {
				if (stderr.includes("already exists")) {
					console.warn(`Docker secret ${_secretName} already exists. Skipping creation.`);
					resolve();
				} else {
					console.error("Docker secret creation error:", stderr);
					reject(error);
				}
				return;
			}
			resolve();
		});
	});
	await fs.unlink(envFilePath); // Clean up the temporary file
	return _secretName;
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

async function findAvailablePort(start: number, end: number, whereKey: string): Promise<number> {
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
				const existingAgent = await prisma.agent.findFirst({ where: { [whereKey]: port } });
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
	envSecretNameOracle: string,
	envSecretNameTerminal: string,
	hostOraclePort: number,
	hostPortAPI: number,
	agentObjectId: string,
	agentAdminCapId: string
): Promise<{ port: number; portTerminal: number; serviceId: string }> {
	// Assign available host ports for the container mappings.
	const hostPortTerminal = await findAvailablePort(7000, 9000, "terminalPort");

	// Read the base .env, append the agent private key, then create the Docker secret
	const agentEnvFilePath = path.join(process.cwd(), "config-agent", ".env");
	const baseEnv = await fs.readFile(agentEnvFilePath, { encoding: "utf8" });
	// ensure no trailing blank lines, then append AGENT_PK
	const envContentAgent = `${baseEnv.trimEnd()}\nSUI_AGENT_PK=${walletKey}\nSUI_AGENT_OBJECT_ID=${agentObjectId}\nSUI_ADMIN_CAP_ID=${agentAdminCapId}\n`;
	const agentEnvSecretName = await createDockerSecretFromEnv(agentId, envContentAgent, `agent_env_secret_${agentId}`);
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

	// ----- Create the Docker service with port mappings, secrets, and config -----
	// The Docker config will be mounted at /characters/agent.json,
	// and the Docker secret will be available at /run/secrets/WALLET_KEY.
	console.log("Creating service command:");
	const serviceCreateCmd =
		`docker service create --name agent-${agentId} ` +
		`--publish published=${hostPortAPI},target=3000 ` +
		`--publish published=${hostPortTerminal},target=7000 ` +
		`--publish published=${hostOraclePort},target=3015 ` +
		`--secret source=${secretName},target=WALLET_KEY ` +
		`--secret source=${agentEnvSecretName},target=/app/eliza-kappabay-agent/.env ` +
		`--secret source=${envSecretNameTerminal},target=/app/kappabay-terminal-next/.env ` +
		`--secret source=${envSecretNameOracle},target=/app/oracle/.env ` +
		`--config source=${configName},target=/app/eliza-kappabay-agent/characters/agent.json ` +
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
			resolve(stdout.split("\n")[0].trim() ?? stdout.trim());
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
		const agentObjectId = deploymentData.onChainData.agentObjectId;
		const agentAdminCapId = deploymentData.onChainData.adminCapId;

		// Encrypt the wallet key for storage.
		const encryptedWalletKey = encrypt(agentWalletKey);

		// Find an available port for the Agent
		const hostPortAPI = await findAvailablePort(3000, 5000, "port");
		// Find an available port for the Oracle
		const hostPortOracle = await findAvailablePort(5001, 7000, "oraclePort");

		// Create Oracle .env content
		const oracleEnvContent = `BASE_URL='http://localhost:${hostPortAPI}'
      INITIAL_TRANSACTION_DIGEST='${deploymentData.onChainData.txDigest}'
      PACKAGE_ID='0xd40628bac089616b1120705e843491f1ec3382f47828fb12bdf035057d06163d'
      NETWORK='testnet'
      AGENT_ID='${agentId}'
      PRIVATE_SEED='${agentWalletKey}'
      PORT='3015'
      `;

		// Create Docker secret for Oracle .env
		const oracleEnvSecretName = await createDockerSecretFromEnv(
			agentId,
			oracleEnvContent,
			`oracle_env_secret_${agentId}`
		);

		const terminalEnvContent = `ENOKI_API_KEY=enoki_public_c23791490124930fcfb553615237ecc5
      GOOGLE_CLIENT_ID=800626683888-hi6a3moj65nlqlsfqqrdtkvjujuo7f8f.apps.googleusercontent.com
      AGENT_API=http://localhost:${hostPortAPI}
    `;

		const terminalEnvSecretName = await createDockerSecretFromEnv(
			agentId,
			terminalEnvContent,
			`terminal_env_secret_${agentId}`
		);

		// Build and start the agent container via Docker using Docker secrets and configs.
		console.log("Awaiting docker deployment.");
		const { port, portTerminal, serviceId } = await buildAndStartAgentDocker(
			agentId,
			agentWalletKey,
			configName,
			oracleEnvSecretName,
			terminalEnvSecretName,
			hostPortOracle,
			hostPortAPI,
			agentObjectId,
			agentAdminCapId
		);

		// Expose the API port over the internet via ngrok
		console.log(`Opening ngrok tunnel on localhost:${port}`);
		const publicUrl = await ngrok.connect({
			proto: "http",
			addr: portTerminal,
			authtoken: process.env.NGROK_AUTH_TOKEN!,
			binPath: () => ngrokAbsolutePath, // Adjust the path to the ngrok binary
		});
		console.log(`ngrok tunnel established: ${publicUrl}`);

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
				oraclePort: hostPortOracle, // For now
				hasOracle: hostPortOracle >= 5001,
				terminalPort: portTerminal,
				ngrokUrl: publicUrl,
			},
		});

		const agentUrl = `http://localhost:${portTerminal}`;

		// Deploy the Oracle using the separate function
		return {
			success: true,
			agentId: agent.id,
			agentWallet: agentWalletAddress,
			port,
			publicUrl,
			agentUrl,
			oracle: {
				success: true,
				hostPortOracle,
				oracleUrl: `http://localhost:${hostPortOracle}`,
			},
		};
	} catch (error) {
		console.error("Agent backend deployment failed:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
