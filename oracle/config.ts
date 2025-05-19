import { Network } from "./sui-utils";
require("dotenv").config();

console.log(`Using network: ${process.env.NETWORK}`);

/**
 * A default configuration
 * */
export const CONFIG = {
  /// Look for events every 1s
  POLLING_INTERVAL_MS: 1000,
  DEFAULT_LIMIT: 50,
  NETWORK: (process.env.NETWORK as Network) || "testnet",
  AGENT_CONTRACT: {
    packageId:
      process.env.PACKAGE_ID ||
      "0x4c775930e974767a7f8ab831af3da5f7bf8b4cf1e780d6f2eea3b152391fa478",
    module: process.env.AGENT_CONTRACT_MODULE || "agent",
  },
  INITIAL_TRANSACTION_DIGEST:
    process.env.INITIAL_TRANSACTION_DIGEST ||
    "2gZwa7szKotFxBeLrng12p9rbtVDqXiu7HbbWdTrbZ6a",
  BASE_URL: process.env.BASE_URL || "http://192.168.1.67:3000",
  AGENT_ID: process.env.AGENT_ID || "47ed2985-5ab6-0f5f-8ac7-1916787f8877",
  PRIVATE_KEY:
    process.env.PRIVATE_SEED ||
    "something something else what the you want here dont copy my seed",
  PROMPT_MANAGER_ID:
    process.env.PROMPT_MANAGER_ID ||
    "0x5a7000a7f3fa322771782b8e7f1298334002b8374604f75000ea7195304e8995",
  AGENT_CAP_ID:
    process.env.AGENT_CAP_ID ||
    "0xd47124f711dc15cf198942637e569703f635f48493ba25ceb4b75f98914fdb09",
};
