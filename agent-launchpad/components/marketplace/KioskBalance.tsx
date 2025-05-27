"use client";

import { useEffect, useState } from "react";
import { useSuiClient, useCurrentAccount } from "@mysten/dapp-kit";
import { KioskClient } from "@mystenlabs/ts-sdks";

export const KioskBalance = () => {
  const suiClient = useSuiClient();
  const { address } = useCurrentAccount();

  const [mistBalance, setMistBalance] = useState<string>("0");

  useEffect(() => {
    if (!address) return;

    // use the official Kiosk SDK to fetch the kiosk.profits field
    const kioskClient = new KioskClient({ provider: suiClient });
    (async () => {
      try {
        const { kioskIds } = await kioskClient.getOwnedKiosks({ address });
        if (kioskIds.length === 0) {
          setMistBalance("0");
          return;
        }
        const { kiosk } = await kioskClient.getKiosk({
          id: kioskIds[0],
          options: { withKioskFields: true },
        });
        setMistBalance(kiosk.profits);
      } catch (e) {
        console.error("Kiosk balance fetch failed", e);
        setMistBalance("0");
      }
    })();
  }, [suiClient, address]);

  // convert mist → SUI
  const sui = Number(mistBalance) / 1e9;

  return (
    <div className="mb-6 p-4 bg-muted rounded-md text-center">
      <span className="font-medium">Your Kiosk SUI Balance:</span>{" "}
      {sui.toLocaleString(undefined, { maximumFractionDigits: 3 })} SUI
    </div>
  );
};
