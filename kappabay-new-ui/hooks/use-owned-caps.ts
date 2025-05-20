import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";

const PACKAGE_ID =
	process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID ||
	(() => {
		throw new Error("NEXT_PUBLIC_DEPLOYER_CONTRACT_ID is not defined");
	})();
const CAP_TYPES = [`${PACKAGE_ID}::agent::AgentCap`, `0x2::kiosk::KioskOwnerCap`] as const;

export function useOwnedCaps() {
	const account = useCurrentAccount();
	const suiClient = useSuiClient();

	const {
		data: caps = [],
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["ownedCaps", account?.address],
		queryFn: async () => {
			if (!account?.address) return [];

			let allObjects: any[] = [];
			let cursor: string | undefined | null = undefined;

			do {
				const response = await suiClient.getOwnedObjects({
					owner: account.address,
					cursor,
					options: { showType: true },
				});

				allObjects.push(...response.data);
				cursor = response.nextCursor;

				if (!response.hasNextPage) break;
			} while (true);

			if (process.env.NODE_ENV === "development") {
				console.log("allObjects", allObjects);
			}

			return allObjects.filter((obj) => obj.data?.type && CAP_TYPES.includes(obj.data.type));
		},
		enabled: !!account?.address,
		staleTime: 30_000, // 30 seconds
		retry: 1, // Retry only once
	});

	return { caps, isLoading, error, refetch };
}
