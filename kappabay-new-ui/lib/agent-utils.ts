import { Transaction } from "@mysten/sui/transactions";

export const getGasBalance = async (agentIds: string[], signAndExecuteTransaction: any) => {
	const tx = new Transaction();
	for (const agentId of agentIds) {
		tx.moveCall({
			target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::check_gas_balance`,
			arguments: [tx.object(agentId)],
		});
	}

	signAndExecuteTransaction(tx)
		.then((result: any) => {
			console.log("result", result);
		})
		.catch((e: any) => {
			console.error("check_gas_balance failed", e);
		});
};
