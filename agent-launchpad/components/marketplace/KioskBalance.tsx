"use client";

import { useEffect, useState } from "react";
import { useSuiClient, useCurrentAccount } from "@mysten/dapp-kit";
import { useOwnedCaps } from "@/hooks/use-owned-caps";

export const KioskBalance = () => {
  const suiClient = useSuiClient();
  const { caps, isLoading: capsLoading } = useOwnedCaps();
  const [mistBalance, setMistBalance] = useState<string>("0");

  useEffect(() => {
    if (capsLoading) return;
    const kioskCap = caps.find(
      (c) => c.data.type === "0x2::kiosk::KioskOwnerCap"
    );
    if (!kioskCap) {
      setMistBalance("0");
      return;
    }
    const kioskId = kioskCap.data.content.fields.for as string;
    suiClient
      .getBalance({ owner: kioskId, coinType: "0x2::sui::SUI" })
      .then((bal) => {
        // if getBalance returns a string or { totalBalance: string }
        const total =
          typeof bal === "string" ? bal : (bal as any).totalBalance;
        setMistBalance(total);
      })
      .catch((e) => {
        console.error("Kiosk balance fetch failed", e);
        setMistBalance("0");
      });
  }, [caps, capsLoading, suiClient]);

  // convert mist → SUI
  const sui = Number(mistBalance) / 1e9;

  return (
    <div className="mb-6 p-4 bg-muted rounded-md text-center">
      <span className="font-medium">Your Kiosk SUI Balance:</span>{" "}
      {sui.toLocaleString(undefined, { maximumFractionDigits: 3 })} SUI
    </div>
  );
};
