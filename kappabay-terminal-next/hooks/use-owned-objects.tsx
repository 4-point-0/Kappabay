import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@suiet/wallet-kit";
import { useZkLogin } from "@mysten/enoki/react";
import { useToast } from "@/hooks/use-toast";
import { SuiClient, SuiObjectResponse } from "@mysten/sui/client";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID;

export function useOwnedObjects() {
	const { connected: suietConnected, address: suietAddress } = useWallet();
	const { address: enokiAddress } = useZkLogin();

	const walletAddress = suietConnected ? suietAddress : enokiAddress;

	const fetchObjects = async () => {
		if (!walletAddress) return null;

		const suiClient = new SuiClient({ url: "https://fullnode.testnet.sui.io" });
		const objects = await suiClient.getOwnedObjects({
			owner: walletAddress,
			options: {
				showContent: true,
				showDisplay: true,
				showType: true,
			},
		});

		// Initialize arrays to hold categorized objects
		const foundNftObjects: SuiObjectResponse[] = [];
		const foundCapObjects: SuiObjectResponse[] = [];
		const foundModalObjects: SuiObjectResponse[] = [];
		const foundAgentCapObjects: SuiObjectResponse[] = [];
		let foundSuiNsObject: SuiObjectResponse | null = null;

		// Iterate over each owned object once
		for (const obj of objects.data) {
			const objType = obj.data?.type || "";

			if (objType.includes(`${PACKAGE_ID}::hot_potato::HotPotato`)) {
				foundNftObjects.push(obj);
			} else if (objType.includes(`${PACKAGE_ID}::hot_potato::GameCap`)) {
				foundCapObjects.push(obj);
			} else if (objType.includes(`${PACKAGE_ID}::hot_potato::ModelCap`)) {
				foundModalObjects.push(obj);
			} else if (objType.includes(`${PACKAGE_ID}::agent::AgentCap`)) {
				foundAgentCapObjects.push(obj);
			} else if (objType.includes("::suins_registration::SuinsRegistration")) {
				foundSuiNsObject = obj;
			}
		}

		// Sort the NFT objects by 'last_transfer_time_ms' descending
		foundNftObjects.sort((a, b) => {
			const aTime = Number((a.data?.content as any)?.fields?.last_transfer_time_ms || 0);
			const bTime = Number((b.data?.content as any)?.fields?.last_transfer_time_ms || 0);
			return bTime - aTime;
		});

		// Sort the GameCap objects based on their associated HotPotato's position
		foundCapObjects.sort((a, b) => {
			const aPotatoId = (a.data?.content as any)?.fields?.potato_id;
			const bPotatoId = (b.data?.content as any)?.fields?.potato_id;

			const aIndex = foundNftObjects.findIndex((nft) => nft.data?.objectId === aPotatoId);
			const bIndex = foundNftObjects.findIndex((nft) => nft.data?.objectId === bPotatoId);

			return aIndex - bIndex;
		});

		// Sort the Modal objects by 'creation_time' descending
		foundModalObjects.sort((a, b) => {
			const aTime = Number((a.data?.content as any)?.fields?.creation_time || 0);
			const bTime = Number((b.data?.content as any)?.fields?.creation_time || 0);
			return bTime - aTime;
		});

		return {
			capObjects: foundCapObjects,
			nftObjects: foundNftObjects,
			modalObjects: foundModalObjects,
			agentCapObjects: foundAgentCapObjects,
			suiNsObject: foundSuiNsObject,
		};
	};

	const {
		data,
		isLoading: isChecking,
		refetch: checkObjects,
	} = useQuery({
		queryKey: ["ownedObjects", walletAddress],
		queryFn: fetchObjects,
		enabled: !!walletAddress,
		staleTime: 10_000, // 10 seconds
		refetchInterval: 10_000, // Auto-refresh every 10 seconds
	});

	return {
		capObjects: data?.capObjects || [],
		nftObjects: data?.nftObjects || [],
		modalObjects: data?.modalObjects || [],
		suiNsObject: data?.suiNsObject || null,
		agentCapObjects: data?.agentCapObjects || [],
		checkObjects,
		isChecking,
	};
}
