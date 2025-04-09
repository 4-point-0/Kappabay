"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { useSuiClient, useWallet } from "@suiet/wallet-kit";
import { useOwnedObjects } from "@/hooks/use-owned-objects";
import { registerPotato } from "@/app/actions/register-potato";
import { useQueryClient } from "@tanstack/react-query";
import { useSendMessageMutation } from "@/hooks/useSendMessageMutation";
import { ContentWithUser } from "./chat";
import { UUID } from "@elizaos/core";
import { apiClient } from "@/lib/api";
import { useEffect } from "react";
import { useEnokiFlow, useZkLogin } from "@mysten/enoki/react";

export function PotatoBakeModal({
	agentId,
	setOpen,
	onCancel,
	onBakeSuccess,
	setIsLoading,
	isLoading = false,
}: {
	agentId: UUID;
	setOpen: (open: boolean) => void;
	onCancel: () => void;
	onBakeSuccess: () => void;
	setIsLoading: (isLoading: boolean) => void;
	isLoading?: boolean;
}) {
	const GAME_MANAGER_ID = process.env.NEXT_PUBLIC_GAME_MANAGER_ID;
	const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID;
	const OVEN_ID = process.env.NEXT_PUBLIC_OVEN_ID;
	const { signAndExecuteTransaction, address } = useWallet();
	const { checkObjects } = useOwnedObjects();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const enokiFlow = useEnokiFlow();
	const { address: enokiAddress } = useZkLogin();

	if (!address && !enokiAddress) {
		return;
	}

	if (!GAME_MANAGER_ID || !PACKAGE_ID || !OVEN_ID) {
		console.error("Missing required environment variables");
		return;
	}

	const sendMessageMutation = useSendMessageMutation(agentId);

	const handleBake = async () => {
		setIsLoading(true);
		try {
			const currentAddress = address ?? enokiAddress;
			if (!currentAddress) {
				throw new Error("No connected address found");
			}
			const tx = new Transaction();
			const requiredAmount = 0.5 * 1e9; // 0.5 SUI in mist
			// tx.setGasBudget(requiredAmount + 20000000);

			// Constants
			const bakePotatoArgs = {
				ovenId: OVEN_ID,
				gameManagerId: GAME_MANAGER_ID,
				clockId: "0x6",
				randomnessId: "0x8",
			};

			const provider = new SuiClient({ url: getFullnodeUrl("testnet") });
			// Check balance
			const walletBalance = await provider.getBalance({ owner: currentAddress });
			const totalBalance = Number(walletBalance.totalBalance);

			if (totalBalance < requiredAmount) {
				throw new Error("Insufficient balance. You need at least 0.5 SUI to bake.");
			}

			const payment = tx.splitCoins(tx.gas, [tx.pure.u64(requiredAmount)])[0];
			tx.moveCall({
				target: `${PACKAGE_ID}::hot_potato::bake_potato`,
				arguments: [
					tx.object(bakePotatoArgs.ovenId),
					tx.object(bakePotatoArgs.gameManagerId),
					payment,
					tx.object(bakePotatoArgs.clockId),
					tx.object(bakePotatoArgs.randomnessId),
					tx.pure.address(currentAddress),
					tx.pure.vector("u8", []),
				],
			});

			let response;
			if (address) {
				response = await signAndExecuteTransaction({
					transaction: tx,
				});
			} else if (enokiAddress) {
				const keypair = await enokiFlow.getKeypair({ network: "testnet" });
				response = await provider.signAndExecuteTransaction({
					signer: keypair,
					transaction: tx,
				});
			}

			if (!response) {
				throw new Error("Failed to sign and execute transaction");
			}

			const txInfo = await provider.waitForTransaction({
				digest: response.digest,
				options: { showEvents: true, showEffects: true },
			});

			if (txInfo.effects?.status?.status === "failure" || txInfo.effects?.status?.status !== "success") {
				throw new Error(txInfo.effects?.status?.error);
			}
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Wait for transaction to complete and check for new potato
			const checkForPotato = async () => {
				const objects = await checkObjects();
				const potatoObject = objects?.data?.nftObjects?.[0];

				if (potatoObject?.data?.objectId) {
					const registration = await registerPotato(potatoObject.data.objectId);
					console.log("registration", registration);

					if (!registration.success) {
						throw new Error(registration.error || "Failed to register potato");
					}
					return potatoObject.data.objectId;
				}
				return null;
			};

			// Try checking for potato with retries
			let retries = 5;
			let potatoId = null;
			while (retries > 0 && !potatoId) {
				potatoId = await checkForPotato();
				if (!potatoId) {
					await new Promise((resolve) => setTimeout(resolve, 800));
					retries--;
				}
			}

			if (!potatoId) {
				throw new Error("Potato not found in wallet after baking");
			}

			onBakeSuccess();

			const input = "Check the Hot Potato game status for my address.";
			const newMessages = [
				{
					text: input,
					user: "system",
					isLoading: true,
					createdAt: Date.now(),
				},
			];

			queryClient.setQueryData(["messages", agentId], (old: ContentWithUser[] = []) => [...old, ...newMessages]);
			sendMessageMutation.mutate({
				message: input,
				selectedFile: null,
				walletAddress: currentAddress || "",
			});
			return response.digest;
		} catch (error) {
			console.error("Baking failed:", error);
			toast({
				title: "Baking Failed",
				description: error instanceof Error ? error.message : "Failed to complete baking and registration process",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
			setOpen(false);
		}
	};

	return (
		<>
			<div className="grid gap-4 py-4">
				<div className="grid grid-cols-4 items-center gap-4">
					<Label htmlFor="bakery" className="text-right">
						Bakery
					</Label>
					<Input id="bakery" value={OVEN_ID} className="col-span-3" readOnly />
				</div>
				<p className="text-center text-sm text-muted-foreground">Bake and receive a new hot potato</p>
			</div>
			<div className="flex justify-end gap-2">
				<Button variant="outline" onClick={onCancel} disabled={isLoading}>
					Cancel
				</Button>
				<Button onClick={handleBake} disabled={isLoading}>
					{isLoading ? (
						<>
							<svg
								className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							Baking...
						</>
					) : (
						"Bake"
					)}
				</Button>
			</div>
		</>
	);
}
