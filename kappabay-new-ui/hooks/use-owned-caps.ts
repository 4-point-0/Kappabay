import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";

const PACKAGE_ID = process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID!;

export function useOwnedCaps() {
	const account = useCurrentAccount();
	const suiClient = useSuiClient();

	const {
		data: caps = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["ownedCaps", account?.address],
		queryFn: async () => {
			if (!account?.address) return [];

			let allObjects: any[] = [];
			let cursor: string | undefined = undefined;

			do {
				const response = await suiClient.getOwnedObjects({
					owner: account.address,
					cursor,
					options: { showType: true },
				});
				console.log("response", response);

				allObjects.push(...response.data);
				cursor = response.nextCursor;

				if (!response.hasNextPage) break;
			} while (true);

			return allObjects.filter(
				(obj) =>
					obj.data?.type && obj.data.type === `${PACKAGE_ID}::agent::AgentCap`
			);
		},
		enabled: !!account?.address,
	});

	return { caps, isLoading, error };
}
