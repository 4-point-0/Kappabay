"use server";

import { getAgentKeypair, getAdminCapId } from "./sui-utils";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";

export async function withdrawGas(
	agentId: string,
	withdrawAmountMist: string,
	agentObjectId: string,
	gasOwnerAddress: string,
	transferToWallet: boolean = true
) {
	// load the agent record, its keypair and address
	const { keypair, address: agentAddress } = await getAgentKeypair(agentId);

	// Initialize a Sui client
	const client = new SuiClient({ url: getFullnodeUrl("testnet") });
	const PACKAGE_ID = process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID;

	// derive the AdminCap object id via our utility
	const adminCapId = await getAdminCapId(client, agentAddress);

	// Build the transaction on the server with extract_gas_for_transaction
	const tx = new Transaction();
	const coin: TransactionResult = tx.moveCall({
		target: `${PACKAGE_ID}::agent::extract_gas_for_transaction`,
		arguments: [tx.object(agentObjectId), tx.object(adminCapId), tx.pure.u64(withdrawAmountMist)],
	});
	// Capture the coin object returned and transfer it to the gas owner's address if requested
	tx.transferObjects([coin], transferToWallet ? gasOwnerAddress : agentAddress);

	// Configure as a sponsored transaction
	tx.setSender(agentAddress); // Agent is the transaction sender
	tx.setGasOwner(gasOwnerAddress); // Connected wallet is the gas payer

	// Build the transaction bytes
	const builtTx = await tx.build({ client });

	// Sign the transaction with the agent's keypair
	const agentSignature = await keypair.signTransaction(builtTx);
	const serializedAgentSignature = agentSignature.signature;

	return {
		adminCapId,
		agentAddress,
		presignedTxBytes: builtTx,
		agentSignature: serializedAgentSignature,
	};
}
