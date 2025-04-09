import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

export async function resolveSuinsName(address: string): Promise<string | null> {
	try {
		const client = new SuiClient({ url: getFullnodeUrl("testnet") });
		const response = await client.resolveNameServiceNames({
			address,
			limit: 1,
		});

		return response.data.length > 0 ? response.data[0] : null;
	} catch (error) {
		console.error("Error resolving SuiNS name:", error);
		return null;
	}
}
