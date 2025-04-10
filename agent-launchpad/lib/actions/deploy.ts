"use server";

import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db";
import { DeploymentData } from "@/lib/types";
import * as net from "net";
import { DeployOracle } from "./deploy-oracle";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { homedir } from "os";

// Environment variables
// AGENT_REPO_URL is still defined for backward compatibility but is no longer used in deployment.
const AGENT_REPO_URL =
  process.env.AGENT_REPO_URL || "https://github.com/elizaagent.git";
const AGENT_BASE_DIR = process.env.AGENT_BASE_DIR || "./agents";

// Function to copy agent repo from a local path instead of cloning it from remote
async function cloneAgentRepo(agentId: string): Promise<string> {
  // Locate the local repository at ~/elizarepo
  const localRepoPath = path.join(homedir(), "elizarepo");
  const agentDir = path.join(AGENT_BASE_DIR, `${agentId}-agents`);

  // Create the target directory if it does not exist
  await fs.mkdir(agentDir, { recursive: true });
  
  // Copy the entire local repository into agentDir.
  // This replaces the previous logic that copied a specific subfolder.
  await fs.cp(localRepoPath, agentDir, { recursive: true });

  return agentDir;
}

// Function to create agent config file
async function createAgentConfig(agentDir: string, config: any): Promise<void> {
  const configPath = path.join(agentDir, "characters", "agent.json");
  await fs.mkdir(path.join(agentDir, "characters"), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

async function findAvailablePort(start: number, end: number): Promise<number> {
  for (let port = start; port <= end; port++) {
    try {
      // Check if port is in use
      const inUse = await new Promise<boolean>((resolve) => {
        const server = net
          .createServer()
          .once("error", (err: any) => {
            resolve(err.code !== "EADDRINUSE" ? false : true);
          })
          .once("listening", () => {
            server.close();
            resolve(false);
          })
          .listen(port);
      });

      if (!inUse) {
        // Additional check against database to ensure no agent is using this port
        const existingAgent = await prisma.agent.findFirst({ where: { port } });
        if (!existingAgent) {
          return port;
        }
      }
    } catch (error) {
      // Continue to next port if there's an error
      continue;
    }
  }
  throw new Error(`No available ports found between ${start} and ${end}`);
}

// Function to build agent
async function buildAndStartAgent(
  agentDir: string,
  agentId: string
): Promise<{ port: number; portTerminal:number; pid: number }> {
  // First, find an available port
  const port = await findAvailablePort(3000, 5000);

  // Build the agent
  await new Promise<void>((resolve, reject) => {
    exec(`cd ${agentDir} && pnpm install && pnpm build`, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  // Start the agent using PM2
  await new Promise<void>((resolve, reject) => {
    exec(
      `cd ${agentDir} && SERVER_PORT=${port} pm2 start pnpm --name="agent-${agentId}" --log="${agentDir}/logs/agent.log" -- start`,
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      }
    );
  });
  const portTerminal = await findAvailablePort(7000, 9000);

  await new Promise<void>((resolve, reject) => {
    exec(
      `cd ${agentDir} && pm2 start "SERVER_PORT=${port} pnpm start:client --port ${portTerminal}" --name="agentTerminal-${agentId}"`,
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      }
    );
  });

  // Get the PM2 process info
  const processInfo = await new Promise<{ pid: number }>((resolve, reject) => {
    exec(`pm2 show agent-${agentId} --format json`, (error, stdout) => {
      if (error) {
        console.warn("Could not get PM2 process info, using default PID");
        resolve({ pid: 0 });
        return;
      }
      try {
        const info = JSON.parse(stdout);
        resolve({ pid: info.pid || 0 });
      } catch (err) {
        console.warn("Could not parse PM2 process info, using default PID");
        resolve({ pid: 0 });
      }
    });
  });

  return { port, portTerminal, pid: processInfo.pid };
}

// Function to copy environment file
async function copyEnvFile(agentDir: string): Promise<void> {
  try {
    const sourceEnvPath = path.resolve(".env.agent");
    const destEnvPath = path.join(agentDir, ".env");

    // Check if source file exists
    await fs.access(sourceEnvPath);

    // Copy the file
    await fs.copyFile(sourceEnvPath, destEnvPath);
    console.log(`Successfully copied env file to ${destEnvPath}`);
  } catch (error) {
    console.error("Failed to copy env file:", error);
    throw error;
  }
}

export async function Deploy(deploymentData: DeploymentData) {
  try {
    // Generate a UUID for the agent's backend identifier
    const agentId = uuidv4();

    // Copy agent repository from the local path ~/elizarepo
    const agentDir = await cloneAgentRepo(agentId);

    // Create agent configuration file
    await createAgentConfig(agentDir, deploymentData.agentConfig);

    // Generate a new wallet for the agent
    const agentKeypair = Ed25519Keypair.generate();
    const agentWalletAddress = agentKeypair.getPublicKey().toSuiAddress();
    const agentWalletKey = agentKeypair.getSecretKey();

    // Create logs directory
    await fs.mkdir(path.join(agentDir, "logs"), { recursive: true });
    await copyEnvFile(agentDir);

    // Build and start the agent
    const { port, portTerminal, pid } = await buildAndStartAgent(agentDir, agentId);

    // Create the database record
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
        agentWalletKey,
        port,
        pid,
        oraclePort: 0, // Set to 0 for now
      },
    });

    const agentUrl = `http://localhost:${portTerminal}`;
    const apiAgentUrl = `http://localhost:${port}`;

    // Deploy the Oracle using the separate function
    try {
      const oracleResult = await DeployOracle(
        agentId,
        apiAgentUrl,
        agentWalletKey // Using the agent wallet private key for the oracle
      );

      // Return all details including oracle information
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
          error:
            oracleError instanceof Error
              ? oracleError.message
              : "Unknown error during oracle deployment",
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
