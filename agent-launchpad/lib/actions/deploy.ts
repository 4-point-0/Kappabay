"use server";

import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db";
import { DeploymentData } from "@/lib/types";
import * as net from "net";

// Environment variables
const AGENT_REPO_URL =
  process.env.AGENT_REPO_URL || "https://github.com/your-org/elizaagent.git";
const AGENT_BASE_DIR = process.env.AGENT_BASE_DIR || "./agents";

// Function to clone agent repo
async function cloneAgentRepo(agentId: string): Promise<string> {
  const agentDir = path.join(AGENT_BASE_DIR, `${agentId}-agent`);

  await fs.mkdir(agentDir, { recursive: true });

  return new Promise((resolve, reject) => {
    exec(`git clone ${AGENT_REPO_URL} ${agentDir}`, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(agentDir);
    });
  });
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
            // If error is not EADDRINUSE, it might be another issue
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
        const existingAgent = await prisma.agent.findFirst({
          where: { port },
        });

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
): Promise<{ port: number; pid: number }> {
  // First, find an available port
  const port = await findAvailablePort(3000, 5000); // Search between 3000-4000

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

  // Start the agent as a background process
  const process = await new Promise<{ pid: number }>((resolve, reject) => {
    // Use SERVER_PORT environment variable to start the client
    const command = `cd ${agentDir} && SERVER_PORT=${port} pnpm start:client > ${agentDir}/logs/agent.log 2>&1 &`;

    exec(command, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      // Get the process ID
      exec(`pgrep -f "SERVER_PORT=${port}"`, (err, pidOutput) => {
        if (err) {
          reject(err);
          return;
        }

        const pid = parseInt(pidOutput.trim(), 10);
        resolve({ pid });
      });
    });
  });

  // Return both port and pid
  return {
    port,
    pid: process.pid,
  };
}

export async function Deploy(deploymentData: DeploymentData) {
  try {
    // Generate a UUID for the agent's backend identifier
    const agentId = uuidv4();

    // Clone agent repository
    const agentDir = await cloneAgentRepo(agentId);

    // Create agent configuration file
    await createAgentConfig(agentDir, deploymentData.agentConfig);

    // Create logs directory
    await fs.mkdir(path.join(agentDir, "logs"), { recursive: true });

    // Build and start the agent
    const { port, pid } = await buildAndStartAgent(agentDir, agentId);

    // Get agent wallet info from the deployment data
    const { address: agentWalletAddress, privateKey: agentWalletKey } =
      deploymentData.agentWallet || { address: "", privateKey: "" };

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
      },
    });

    return {
      success: true,
      agentId: agent.id,
      agentWallet: deploymentData.agentWallet,
      port, // Return the port so it can be displayed to the user
      agentUrl: `http://localhost:${port}`, // Add the full agent URL
    };
  } catch (error) {
    console.error("Agent backend deployment failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
