import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "react-query";

export function useOwnedCaps() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();

  const { data, isLoading, error } = useQuery(
    ["ownedCaps", account?.address],
    async () => {
      if (!account?.address) return [];
      const response = await suiClient.getOwnedObjects({
        owner: account.address,
        options: { showType: true, showDisplay: true },
      });
      // Filter for capability objects – adjust the string below to match your capability type
      return response.data.filter((obj: any) =>
        obj.data?.type && obj.data.type.includes("KioskOwnerCap")
      );
    },
    { enabled: !!account?.address }
  );

  return { caps: data || [], isLoading, error };
}
