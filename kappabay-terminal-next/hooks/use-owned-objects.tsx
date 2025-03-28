import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@suiet/wallet-kit";
import { useZkLogin } from "@mysten/enoki/react";
import { useToast } from "@/hooks/use-toast";
import { SuiClient, SuiObjectResponse } from "@mysten/sui/client";

type GroupedObjects = {
	potatoId: string;
	nftObject: SuiObjectResponse;
	capObjects: SuiObjectResponse;
}[];

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

		// Filter and sort NFT objects
		const foundNftObjects = objects.data
			.filter((obj) => obj.data?.type?.includes(`${PACKAGE_ID}::hot_potato::HotPotato`))
			.sort((a, b) => {
				const aTime = Number((a.data?.content as any)?.fields?.last_transfer_time_ms || 0);
				const bTime = Number((b.data?.content as any)?.fields?.last_transfer_time_ms || 0);
				return bTime - aTime;
			});

		// Filter and sort cap objects
		const foundCapObjects = objects.data
			.filter((obj) => obj.data?.type?.includes(`${PACKAGE_ID}::hot_potato::GameCap`))
			.sort((a, b) => {
				const aIndex = foundNftObjects.findIndex(
					(nft) => nft.data?.objectId === (a.data?.content as any)?.fields?.potato_id
				);
				const bIndex = foundNftObjects.findIndex(
					(nft) => nft.data?.objectId === (b.data?.content as any)?.fields?.potato_id
				);
				return aIndex - bIndex;
			});

		// Filter and sort modal objects
		const foundModalObjects = objects.data
			.filter((obj) => obj.data?.type?.includes(`${PACKAGE_ID}::hot_potato::ModelCap`))
			.sort((a, b) => {
				const aTime = Number((a.data?.content as any)?.fields?.creation_time || 0);
				const bTime = Number((b.data?.content as any)?.fields?.creation_time || 0);
				return bTime - aTime;
			});

		// Group related objects
		const groupedObjects = foundNftObjects.map((nftObject, index) => ({
			potatoId: nftObject.data?.objectId || "",
			nftObject,
			capObjects: foundCapObjects[index],
		}));

		// Find SuiNS registration
		const suiNsObject =
			objects.data.find((obj) => obj.data?.type?.includes("::suins_registration::SuinsRegistration")) || null;

		return {
			capObjects: foundCapObjects,
			nftObjects: foundNftObjects,
			modalObjects: foundModalObjects,
			suiNsObject,
			groupedObjects,
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
		staleTime: 30000, // 30 seconds
		refetchInterval: 30000, // Auto-refresh every 30 seconds
	});

	return {
		capObjects: data?.capObjects || [],
		nftObjects: data?.nftObjects || [],
		modalObjects: data?.modalObjects || [],
		suiNsObject: data?.suiNsObject || null,
		groupedObjects: data?.groupedObjects || [],
		checkObjects,
		isChecking,
	};
}
