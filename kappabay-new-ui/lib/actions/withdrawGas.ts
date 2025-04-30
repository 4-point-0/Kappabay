'use server'

import { prisma } from "../db";
import { decrypt } from "../utils";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui-keypairs";

// Server Action: Given an agentId, find the agent in the DB,
// then build and sign a Sui Move transaction calling withdraw_gas.
// Note: withdraw_gas expects (agent: &mut Agent, cap: &AdminCap, amount: u64, ctx: &mut TxContext)
// Here we use agent.objectId for the agent, agent.capId for the admin cap,
// and pass 0 (u64) as the amount.
// The transaction is signed using the agent's decrypted private key from agentWalletKey.
// The signed transaction is returned (not sent) and will be executed elsewhere.
export async function withdrawGas(agentId: string) {
  // Retrieve the agent from the database
  const agent = await prisma.agent.findUnique({
    where: { id: agentId }
  });
  if (!agent) {
    throw new Error(`Agent not found for id ${agentId}`);
  }
  if (!agent.agentWalletKey) {
    throw new Error(`Agent wallet key not found for agent ${agentId}`);
  }

  // Decrypt the encrypted wallet key
  const decryptedKey = decrypt(agent.agentWalletKey);

  // Create a keypair from the decrypted private key.
  // The private key is expected to be in hexadecimal format.
  const keypair = Ed25519Keypair.fromSecretKey(
    Uint8Array.from(Buffer.from(decryptedKey, 'hex'))
  );

  // Instantiate a new transaction
  const tx = new Transaction();

  // Build the move call for withdraw_gas.
  // The amount is 0 (u64). The TxContext parameter is provided automatically.
  tx.moveCall({
    target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::withdraw_gas`,
    arguments: [
      agent.objectId, // Agent object id from the DB
      agent.capId,    // The AdminCap (from agent.capId)
      tx.pure.u64(0)  // Amount: 0 (in u64)
    ],
    gasBudget: 10000 // Adjust gas budget as needed.
  });

  // Sign the transaction using the agent's keypair.
  const signedTx = tx.sign({ keypair });

  // Return the signed transaction without sending it.
  return signedTx;
}
