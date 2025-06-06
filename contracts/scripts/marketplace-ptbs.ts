// marketplace-ptbs.ts - functions that can be directly copied to frontend code
import { Transaction } from "@mysten/sui/transactions";

const PACKAGE_ID =
  "0x7d892b57ed607b6c8ba029296a7c679ab7e70bfe3e82b67e005c337d02c369a6";

/**
 * Creates a transaction for initializing a new marketplace
 *
 * @param publisherId - ID of the Publisher object
 * @param royaltyPercentage - Royalty percentage in basis points (100 = 1%)
 * @returns Transaction to be signed and executed
 */
export function initializeMarketplace(
  publisherId: string,
  royaltyPercentage: number | string
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::agent_marketplace::initialize_marketplace`,
    arguments: [
      tx.object(publisherId),
      tx.pure.u64(royaltyPercentage.toString()),
    ],
  });

  return tx;
}

/**
 * Creates a transaction for creating a new user kiosk
 *
 * @returns Transaction to be signed and executed
 */
export function createUserKiosk(): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::agent_marketplace::create_user_kiosk`,
  });

  return tx;
}

/**
 * Creates a transaction for listing an agent in the marketplace
 *
 * @param marketplaceId - ID of the marketplace
 * @param agentCapId - ID of the agent capability
 * @param agentId - ID of the agent
 * @param kioskId - ID of the kiosk
 * @param kioskCapId - ID of the kiosk owner capability
 * @param price - Price in MIST
 * @param name - Name of the agent
 * @param description - Description of the agent
 * @param imageUrl - URL of the agent image
 * @returns Transaction to be signed and executed
 */
export function listAgent(
  marketplaceId: string,
  agentCapId: string,
  agentId: string,
  kioskId: string,
  kioskCapId: string,
  price: number | string,
  name: string,
  description: string,
  imageUrl: string
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::agent_marketplace::list_agent`,
    arguments: [
      tx.object(marketplaceId),
      tx.object(agentCapId),
      tx.object(agentId),
      tx.object(kioskId),
      tx.object(kioskCapId),
      tx.pure.u64(price.toString()),
      tx.pure.string(name),
      tx.pure.string(description),
      tx.pure.string(imageUrl),
    ],
  });

  return tx;
}

/**
 * Creates a transaction for purchasing an agent from the marketplace
 *
 * @param marketplaceId - ID of the marketplace
 * @param kioskId - ID of the kiosk containing the agent
 * @param agentCapId - ID of the agent capability
 * @param policyId - ID of the transfer policy
 * @param paymentCoinId - ID of the coin to use for payment
 * @returns Transaction to be signed and executed
 */
export function purchaseAgent(
  marketplaceId: string,
  kioskId: string,
  agentCapId: string,
  policyId: string,
  paymentCoinId: string
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::agent_marketplace::purchase_agent`,
    arguments: [
      tx.object(marketplaceId),
      tx.object(kioskId),
      tx.pure.id(agentCapId),
      tx.object(policyId),
      tx.object(paymentCoinId),
    ],
  });

  return tx;
}

/**
 * Creates a transaction for delisting an agent from the marketplace
 *
 * @param marketplaceId - ID of the marketplace
 * @param kioskId - ID of the kiosk containing the agent
 * @param kioskCapId - ID of the kiosk owner capability
 * @param agentCapId - ID of the agent capability
 * @returns Transaction to be signed and executed
 */
export function delistAgent(
  marketplaceId: string,
  kioskId: string,
  kioskCapId: string,
  agentCapId: string
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::agent_marketplace::delist_agent`,
    arguments: [
      tx.object(marketplaceId),
      tx.object(kioskId),
      tx.object(kioskCapId),
      tx.pure.id(agentCapId),
    ],
  });

  return tx;
}

/**
 * Creates a transaction for creating an agent
 *
 * @param configuration - Agent configuration data
 * @param coinId - ID of the coin to use for initial gas
 * @param imageUrl - URL of the agent image
 * @returns Transaction to be signed and executed
 */
export function createAgent(
  configuration: string,
  coinId: string,
  imageUrl: string
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::agent::create_agent`,
    arguments: [
      tx.pure.string(configuration),
      tx.object(coinId),
      tx.pure.string(imageUrl),
    ],
  });

  return tx;
}
