"use server";

import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import * as net from "net";

// Environment variables
const ORACLE_REPO_URL =
  process.env.ORACLE_REPO_URL || "https://github.com/4-point-0/Kappabay.git";
const ORACLE_BASE_DIR = process.env.ORACLE_BASE_DIR || "./oracles";
const NETWORK = process.env.NETWORK || "testnet";

// Find available port
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
          where: { oraclePort: port },
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

// Function to create .env file for oracle
async function createOracleEnvFile(
  oracleDir: string,
  agentId: string,
  agentUrl: string,
  txDigest: string,
  packageId: string = "0x0c4671462cacb9605bb026c4a1cae8745f04d0bbab6836c146235ef4bc8c2170",
  network: string = "testnet",
  privateSeed: string,
  port: number
): Promise<void> {
  const envContent = `BASE_URL='${agentUrl}'
INITIAL_TRANSACTION_DIGEST='${txDigest}'
PACKAGE_ID='${packageId}'
NETWORK='${network}'
AGENT_ID='${agentId}'
PRIVATE_SEED='${privateSeed}'
PORT='${port}'
`;

  const envPath = path.join(oracleDir, ".env");
  await fs.writeFile(envPath, envContent);
}

// Function to setup and start oracle
async function setupAndStartOracle(
  oracleDir: string,
  port: number
): Promise<{ oraclePid: number }> {
  // Create logs directory
  await fs.mkdir(path.join(oracleDir, "logs"), { recursive: true });

  // Install dependencies
  await new Promise<void>((resolve, reject) => {
    exec(`cd ${oracleDir} && pnpm install`, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  // Setup database
  await new Promise<void>((resolve, reject) => {
    exec(`cd ${oracleDir} && pnpm db:setup:dev`, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  // Start the oracle using PM2
  await new Promise<void>((resolve, reject) => {
    exec(
      `cd ${oracleDir} && pm2 start "pnpm dev" --name="oracle-${path.basename(
        oracleDir
      )}" --log="${oracleDir}/logs/oracle.log"`,
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
    exec(
      `pm2 show oracle-${path.basename(oracleDir)} --format json`,
      (error, stdout) => {
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
      }
    );
  });

  return {
    oraclePid: processInfo.pid,
  };
}

export async function DeployOracle(
  agentId: string,
  agentUrl: string,
  privateSeed: string
) {
  try {
    // Get agent details from database
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    // Find an available port for the oracle
    const oraclePort = await findAvailablePort(5001, 7000);

    // Clone oracle repository
    const oracleDir = await cloneOracleRepo(agentId);

    // Create .env file with agent-specific configuration
    await createOracleEnvFile(
      oracleDir,
      agentId,
      agentUrl,
      agent.txDigest || "2gZwa7szKotFxBeLrng12p9rbtVDqXiu7HbbWdTrbZ6a",
      "0x0c4671462cacb9605bb026c4a1cae8745f04d0bbab6836c146235ef4bc8c2170",
      NETWORK,
      privateSeed,
      oraclePort
    );

    // Setup and start the oracle
    const { oraclePid } = await setupAndStartOracle(oracleDir, oraclePort);

    // Update agent in database to include oracle information
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        oraclePort,
        oraclePid,
        hasOracle: true,
      },
    });

    return {
      success: true,
      oraclePath: oracleDir,
      oraclePort,
      oracleUrl: `http://localhost:${oraclePort}`,
      oraclePid,
    };
  } catch (error) {
    console.error("Oracle deployment failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
