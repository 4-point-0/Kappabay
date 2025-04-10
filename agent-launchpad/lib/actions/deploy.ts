"use server";

import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db";
import { DeploymentData } from "@/lib/types";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { toBase64 } from "@mysten/sui/utils";

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

// Function to build agent
async function buildAgent(agentDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`cd ${agentDir} && pnpm install && pnpm build`, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export async function Deploy(deploymentData: DeploymentData) {
  try {
    // Generate a UUID for the agent's backend identifier
    const agentId = uuidv4();

    // Clone agent repository
    const agentDir = await cloneAgentRepo(agentId);

    // Create agent configuration file
    await createAgentConfig(agentDir, deploymentData.agentConfig);

    // Build agent
    await buildAgent(agentDir);

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
        agentWalletAddress, // Add the new fields
        agentWalletKey,
      },
    });

    return {
      success: true,
      agentId: agent.id,
      agentWallet: deploymentData.agentWallet,
    };
  } catch (error) {
    console.error("Agent backend deployment failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
