import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useQueryClient } from "@tanstack/react-query";
import React from "react";

export function useOwnedCaps() {
	const account = useCurrentAccount();
	const suiClient = useSuiClient();
	const queryClient = useQueryClient();
	const [data, setData] = React.useState<any[]>([]);
	const [isLoading, setIsLoading] = React.useState(false);
	const [error, setError] = React.useState<Error | null>(null);

	React.useEffect(() => {
		if (!account?.address) return;
		setIsLoading(true);
		queryClient
			.fetchQuery(["ownedCaps", account.address], async () => {
				const response = await suiClient.getOwnedObjects(account.address, { showType: true, showDisplay: true });
				const objects = response.data || response;
				return objects.filter((obj: any) => obj.data?.type && obj.data.type.includes("KioskOwnerCap"));
			})
			.then(setData)
			.catch(setError)
			.finally(() => setIsLoading(false));
	}, [account?.address, queryClient, suiClient]);

	return { caps: data || [], isLoading, error };
}
