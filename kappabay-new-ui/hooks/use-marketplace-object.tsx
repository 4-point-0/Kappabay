import { useState, useEffect } from "react";
import { useSuiClient } from "@mysten/dapp-kit";

export function useMarketplaceObject(marketplaceId: string) {
  const suiClient = useSuiClient();
  const [fields, setFields] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!marketplaceId) return;
    let canceled = false;

    async function fetchObject() {
      setLoading(true);
      try {
        const resp = await suiClient.getObject({
          id: marketplaceId,
          options: { showType: true, showContent: true },
        });
        const content = resp.data?.content;
        if (!canceled && content?.dataType === "moveObject") {
          setFields(content.fields);
        }
      } catch (e: any) {
        if (!canceled) setError(e);
      } finally {
        if (!canceled) setLoading(false);
      }
    }

    fetchObject();
    return () => {
      canceled = true;
    };
  }, [suiClient, marketplaceId]);

  return { fields, loading, error };
}
