"use client";

import { useEffect, useState, useCallback } from "react";
import { useSuiClient, useCurrentAccount } from "@mysten/dapp-kit";
import { KioskClient, KioskTransaction, Network } from "@mysten/kiosk";
import { Transaction } from "@mysten/sui/transactions";
import { useSignExecuteAndWaitForTransaction } from "@/hooks/use-sign";
import { toast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const KioskBalance = () => {
	const suiClient = useSuiClient();
	const account = useCurrentAccount();
	const signAndExecute = useSignExecuteAndWaitForTransaction();

	const [mistBalance, setMistBalance] = useState<string>("0");
	const [kioskCap, setKioskCap] = useState<any>(null);
	const [kioskId, setKioskId] = useState<string>("");
	const [withdrawing, setWithdrawing] = useState<boolean>(false);

	const fetchBalance = useCallback(async () => {
		if (!account?.address) return;
		const address = account.address;
		const kioskClient = new KioskClient({ client: suiClient, network: Network.TESTNET });
		try {
			const { kioskIds, kioskOwnerCaps } = await kioskClient.getOwnedKiosks({ address });
			if (kioskIds.length === 0) {
				setMistBalance("0");
				setKioskCap(null);
				setKioskId("");
				return;
			}
			const { kiosk } = await kioskClient.getKiosk({
				id: kioskIds[0],
				options: { withKioskFields: true },
			});
			setKioskCap(kioskOwnerCaps[0]);
			setKioskId(kioskIds[0]);
			setMistBalance(kiosk?.profits ?? "0");
		} catch (e) {
			console.error("Kiosk balance fetch failed", e);
			setMistBalance("0");
			setKioskCap(null);
			setKioskId("");
		}
	}, [suiClient, account?.address]);

	useEffect(() => {
		fetchBalance();
	}, [fetchBalance]);

	const handleWithdraw = async () => {
		if (!kioskCap || !kioskId) return;
		setWithdrawing(true);
		try {
			const tx = new Transaction();
			const kioskTx = new KioskTransaction({
				transaction: tx,
				kioskClient: new KioskClient({ client: suiClient, network: Network.TESTNET }),
				cap: kioskCap,
			});
			kioskTx.withdraw(account.address, BigInt(mistBalance));
			kioskTx.finalize();
			await signAndExecute(tx);
			toast({ title: "Withdraw successful" });
			await fetchBalance();
		} catch (e) {
			console.error("Withdraw failed", e);
			toast({ title: "Withdraw failed", variant: "destructive" });
		} finally {
			setWithdrawing(false);
		}
	};

	// convert mist → SUI
	const sui = Number(mistBalance) / 1e9;

	return (
		<Card className="mb-6">
			<CardHeader>
				<CardTitle>Your Kiosk SUI Balance</CardTitle>
			</CardHeader>
			<CardContent className="flex items-center justify-between">
				<span className="font-medium">
					{sui.toLocaleString(undefined, { maximumFractionDigits: 3 })} SUI
				</span>
				<Button
					onClick={handleWithdraw}
					disabled={withdrawing || mistBalance === "0"}
					variant="default"
					size="sm"
				>
					{withdrawing ? "Withdrawing..." : "Withdraw All"}
				</Button>
			</CardContent>
		</Card>
	);
};
