"use client";

import { useEffect, useState } from "react";
import { useSuiClient, useCurrentAccount } from "@mysten/dapp-kit";
import { KioskClient, Network } from "@mysten/kiosk";

export const KioskBalance = () => {
	const suiClient = useSuiClient();
	const account = useCurrentAccount();

	const [mistBalance, setMistBalance] = useState<string>("0");

	useEffect(() => {
		if (!account?.address) return;
		const address = account.address;
		// use the official Kiosk SDK to fetch the kiosk.profits field
		const kioskClient = new KioskClient({ client: suiClient, network: Network.TESTNET });
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

				console.log("kiosk", kiosk);

				setMistBalance(kiosk?.profits ?? "0");
			} catch (e) {
				console.error("Kiosk balance fetch failed", e);
				setMistBalance("0");
			}
		})();
	}, [suiClient, account?.address]);

	// convert mist → SUI
	const sui = Number(mistBalance) / 1e9;

	return (
		<div className="mb-6 p-4 bg-muted rounded-md text-center">
			<span className="font-medium">Your Kiosk SUI Balance:</span>{" "}
			{sui.toLocaleString(undefined, { maximumFractionDigits: 3 })} SUI
		</div>
	);
};
