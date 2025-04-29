import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";

export function useOwnedCaps() {
	const account = useCurrentAccount();
	const suiClient = useSuiClient();
	// use useQueryClient instead of useQuery ai!
	const { data, isLoading, error } = useQuery(
		["ownedCaps", account?.address],
		async () => {
			if (!account?.address) return [];
			const response = await suiClient.getOwnedObjects(account.address, { showType: true, showDisplay: true });
			const objects = response.data || response;
			// Filter for capability objects – adjust the string below to match your capability type
			return objects.filter((obj: any) => obj.data?.type && obj.data.type.includes("KioskOwnerCap"));
		},
		{ enabled: !!account?.address }
	);

	return { caps: data || [], isLoading, error };
}
