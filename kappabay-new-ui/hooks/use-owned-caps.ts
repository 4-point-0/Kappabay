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

			const response = await suiClient.getOwnedObjects({
				owner: account.address,
				options: { showType: true },
			});

			// Get the data array from the response
			const objects = response.data;

			// Filter objects that have KioskOwnerCap in their type
			return objects.filter((obj) => obj.data?.type && obj.data.type === `${PACKAGE_ID}::agent::AgentCap`);
		},
		enabled: !!account?.address,
	});

	return { caps, isLoading, error };
}
