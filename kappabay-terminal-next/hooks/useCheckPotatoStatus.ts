import { useSuiClient, useWallet } from "@suiet/wallet-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useOwnedObjects } from "./use-owned-objects";
import { useEnokiFlow, useZkLogin } from "@mysten/enoki/react";
import { SuiClient } from "@mysten/sui/client";

export function useCheckPotatoStatus() {
	const { connected, signAndExecuteTransaction, address } = useWallet();
	const client: SuiClient = useSuiClient();
	const enokiFlow = useEnokiFlow();
	const { address: enokiAddress } = useZkLogin();
	const { capObjects, nftObjects } = useOwnedObjects();
	const gameCapId = capObjects?.[0]?.data?.objectId;
	const potatoId = nftObjects?.[0]?.data?.objectId;

	const checkStatus = async () => {
		if (!connected) throw new Error("Wallet not connected");
		if (!potatoId || !gameCapId) throw new Error("Missing required IDs");
		try {
			const txb = new Transaction();
			txb.setGasBudget(5000000);

			txb.moveCall({
				target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::hot_potato::check_potato_status`,
				arguments: [
					txb.object(potatoId),
					txb.object(gameCapId),
					txb.object("0x6"), // Clock object
				],
			});
			let result;
			if (address) {
				result = await signAndExecuteTransaction({
					transaction: txb,
				});
			} else if (enokiAddress) {
				const keypair = await enokiFlow.getKeypair({ network: "testnet" });
				result = await client.signAndExecuteTransaction({
					signer: keypair,
					transaction: txb,
				});
			}

			if (!result) {
				throw new Error("Failed to sign and execute transaction");
			}
			// Parse events to determine registration status
			const registrationEvent = (result as any).events?.find((event: any) => event.type.includes("PotatoStatusCheck"));

			if (!registrationEvent) {
				throw new Error("No status check event found");
			}

			return {
				isRegistered: registrationEvent.parsedJson?.is_registered ?? false,
				digest: result.digest,
				events: (result as any).events,
			};
		} catch (e) {
			console.log("error", e);
			return {
				isRegistered: false,
				digest: null,
				events: null,
			};
		}
	};

	return {
		checkStatus,
		potatoId,
		gameCapId,
		isReady: !!connected && !!potatoId && !!gameCapId,
	};
}
