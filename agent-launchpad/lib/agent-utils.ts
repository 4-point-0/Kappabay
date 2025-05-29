import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { getAgentInfo } from "./actions/get-agent-info";
import { AgentConfig } from "./types";

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

// fetch on‐chain agent configuration
export const fetchAgentConfig = async (id: string, client: SuiClient): Promise<AgentConfig> => {
	// 1) load the DB record (and get its objectId)
	const agent = await getAgentInfo(id);
	if (!agent?.objectId) {
		throw new Error(`Agent ${id} missing objectId`);
	}

	// 2) fetch the NFT object from Sui
	const suiObj = await client.getObject({
		id: agent.objectId,
		options: { showContent: true },
	});
	if (!suiObj.data?.content) {
		throw new Error(`On‐chain object ${agent.objectId} not found`);
	}
	// 3) pull the live configuration out of its fields
	//    config comes back as a number[][] (chunks of u8)
	const raw: number[][] = (suiObj.data.content as any).fields.configuration;
	// flatten into one big byte array
	const flat = raw.flat();
	// decode into a UTF-8 string
	const jsonText = new TextDecoder().decode(Uint8Array.from(flat));

	// parse into your AgentConfig
	return JSON.parse(jsonText) as AgentConfig;
};
