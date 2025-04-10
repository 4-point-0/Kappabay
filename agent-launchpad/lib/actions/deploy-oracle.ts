"use server";

import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";

// Environment variables
const ORACLE_REPO_URL =
  process.env.ORACLE_REPO_URL || "https://github.com/4-point-0/Kappabay.git";
const ORACLE_BASE_DIR = process.env.ORACLE_BASE_DIR || "./oracles";
const NETWORK = process.env.NETWORK || "testnet";

// Function to clone oracle repo and extract specific folder
async function cloneOracleRepo(agentId: string): Promise<string> {
  const tempDir = path.join(ORACLE_BASE_DIR, `temp-${agentId}`);
  const oracleDir = path.join(ORACLE_BASE_DIR, `${agentId}-oracle`);

  // Create directories
  await fs.mkdir(tempDir, { recursive: true });
  await fs.mkdir(oracleDir, { recursive: true });

  // Clone the repo to a temporary directory
  return new Promise((resolve, reject) => {
    exec(`git clone ${ORACLE_REPO_URL} ${tempDir}`, async (error) => {
      if (error) {
        reject(error);
        return;
      }

      try {
        // Copy only the oracle folder to the destination
        await fs.cp(path.join(tempDir, "oracle"), oracleDir, {
          recursive: true,
        });

        // Clean up temp directory
        await fs.rm(tempDir, { recursive: true, force: true });

        resolve(oracleDir);
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Function to create .env file
async function createEnvFile(
  oracleDir: string,
  agentId: string,
  baseUrl: string = "http://192.168.12.89:3000",
  transactionDigest: string = "2gZwa7szKotFxBeLrng12p9rbtVDqXiu7HbbWdTrbZ6a",
  packageId: string = "0x0c4671462cacb9605bb026c4a1cae8745f04d0bbab6836c146235ef4bc8c2170",
  network: string = "testnet",
  privateSeed: string = "your_private_seed_here",
  port: number = 3000
): Promise<void> {
  const envContent = `BASE_URL='${baseUrl}'
INITIAL_TRANSACTION_DIGEST='${transactionDigest}'
PACKAGE_ID='${packageId}'
NETWORK='${network}'
AGENT_ID='${agentId}'
PRIVATE_SEED='${privateSeed}'
PORT='${port}'
`;

  const envPath = path.join(oracleDir, ".env");
  await fs.writeFile(envPath, envContent);
}

export async function DeployOracle(
  agentId: string,
  privateSeed: string,
  agentUrl: string,
  port: number = 3000
) {
  try {
    // Get agent details from database
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    // Clone oracle repository and get the oracle folder
    const oracleDir = await cloneOracleRepo(agentId);

    // Create .env file with agent-specific configuration
    await createEnvFile(
      oracleDir,
      agentId,
      agentUrl,
      agent.txDigest || "2gZwa7szKotFxBeLrng12p9rbtVDqXiu7HbbWdTrbZ6a",
      "0x0c4671462cacb9605bb026c4a1cae8745f04d0bbab6836c146235ef4bc8c2170",
      NETWORK,
      privateSeed,
      port,
    );

    // Update agent in database to include oracle information
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        oraclePath: oracleDir,
        hasOracle: true,
      },
    });

    return {
      success: true,
      oraclePath: oracleDir,
    };
  } catch (error) {
    console.error("Oracle deployment failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
