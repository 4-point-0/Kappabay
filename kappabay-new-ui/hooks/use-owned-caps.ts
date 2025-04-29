import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";

export function useOwnedCaps() {
	const account = useCurrentAccount();
	const suiClient = useSuiClient();
	// there is error in this function:
	//
	// Expected 1-2 arguments, but got 3.ts(2554)
	// ⚠ Error (TS2554)  |
	//Expected 1-2 arguments, but got 3.
	//(property) WalletAccount.address: string | undefined
	// Address of the account, corresponding with a public key.
	//
	// fix it ai!
	const { data, isLoading, error } = useQuery(
		["ownedCaps", account?.address],
		async () => {
			if (!account?.address) return [];
			const response = await suiClient.getOwnedObjects({
				owner: account.address,
				options: { showType: true, showDisplay: true },
			});
			const objects = response.data || response;
			// Filter for capability objects – adjust the string below to match your capability type
			return objects.filter((obj: any) => obj.data?.type && obj.data.type.includes("KioskOwnerCap"));
		},
		{ enabled: !!account?.address }
	);

	return { caps: data || [], isLoading, error };
}
