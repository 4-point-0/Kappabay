"use client";
import { useState } from "react";
import { useWallet, useSuiClient } from "@suiet/wallet-kit";
import { Transaction } from "@mysten/sui/transactions";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { recordTransfer } from "@/app/actions/record-transfer";
import { PotatoTransferModal } from "./nft-transfer-modal";
import { useOwnedObjects } from "@/hooks/use-owned-objects";
import { SuiClient } from "@mysten/sui/client";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ContentWithUser } from "./chat";

interface TransferModalProps {
	nftObjectId: string;
	capObjectId: string;
	agentId: string;
}

export default function TransferModal({ nftObjectId, capObjectId, agentId }: TransferModalProps) {
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const { toast } = useToast();
	const wallet = useWallet();
	const client: SuiClient = useSuiClient();
	const { checkObjects } = useOwnedObjects();
	const queryClient = useQueryClient();

	const handleSendNFT = async (toAddress: string) => {
		setIsLoading(true);
		try {
			if (!wallet.connected) {
				throw new Error("Wallet not connected");
			}

			const potatoId = nftObjectId;
			const gameCapId = capObjectId;

			if (!potatoId || !gameCapId) {
				throw new Error("Missing required objects - potato or game capability not found");
			}

			const txb = new Transaction();
			txb.moveCall({
				target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::hot_potato::transfer_potato`,
				arguments: [txb.object(potatoId), txb.object(gameCapId), txb.object("0x6"), txb.pure.address(toAddress)],
			});

			// Execute transfer transaction
			const result = await wallet.signAndExecuteTransaction({
				transaction: txb,
			});
			const txInfo = await client.waitForTransaction({ digest: result.digest, options: { showEvents: true } });

			console.log("txInfo", txInfo);
			let transferEvent;
			let expiredEvent;
			let burnEvent;
			txInfo.events?.forEach((event) => {
				if (event.type === `${process.env.NEXT_PUBLIC_PACKAGE_ID!}::hot_potato::PotatoExpired`) {
					expiredEvent = event;
				}
				if (event.type === `${process.env.NEXT_PUBLIC_PACKAGE_ID!}::hot_potato::PotatoTransferred`) {
					transferEvent = event;
				}
				if (event.type === `${process.env.NEXT_PUBLIC_PACKAGE_ID!}::hot_potato::PotatoBurned`) {
					burnEvent = event;
				}
			});

			if (expiredEvent) {
				throw new Error("Potato held for to long and Expired");
			} else if (burnEvent) {
				throw new Error("Potato held for to long and Burned");
			}

			if (!transferEvent) {
				throw new Error("Unknown transfer error");
			}

			// Record the transfer with the game manager
			const recordResult = await recordTransfer(potatoId, toAddress);
			if (!recordResult.success) {
				throw new Error(recordResult.error || "Failed to record transfer");
			}

			toast({
				title: "Transfer Complete",
				description: (
					<div>
						<p>To: {toAddress}</p>
						<p className="text-xs mt-1">
							Transaction:{" "}
							<Link
								href={`https://suiscan.xyz/testnet/tx/${result.digest}`}
								target="_blank"
								rel="noopener noreferrer"
								className="text-blue-500 hover:underline"
							>
								{result.digest}
							</Link>
						</p>
					</div>
				),
			});

			return { transferResult: result, recordResult };
		} catch (error) {
			console.error("Transfer failed:", error);
			toast({
				title: "Transfer Failed",
				description: error instanceof Error ? error.message : "Failed to complete transfer",
				variant: "destructive",
			});
			throw error;
		} finally {
			await checkObjects();
			setOpen(false);
			setIsLoading(false);
		}
	};

	return (
		<>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<div className="hotPotato">
						<span className="sr-only">Open NFT transfer modal</span>
					</div>
				</DialogTrigger>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Transfer Hot Potato</DialogTitle>
						<DialogDescription>Transfer baked potato to a friend</DialogDescription>
					</DialogHeader>

					<PotatoTransferModal
						nftObjectId={nftObjectId}
						capObjectId={capObjectId}
						onCancel={() => setOpen(false)}
						onSend={handleSendNFT}
						isLoading={isLoading}
					/>
				</DialogContent>
			</Dialog>
			{/* Add the CSS for the hot potato animation */}
			<style>{`
					.hotPotato {
						/* Establish a new stacking context */
						position: relative;
						z-index: 0;

						width: 100px;
						height: 100px;
						background: url("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/hotpotato-3tRFF6fMBqYKU492fLdATEro3Frpdp.png")
							no-repeat center/cover;
						border-radius: 50%;
						cursor: pointer;

						/* Example float animation */
						animation: float 3s ease-in-out infinite;

						/* Place it somewhere on the screen */
						position: fixed;
						bottom: 5rem;
						left: 4.5rem;
					}

					/* The flame or glow goes behind the potato via z-index: -1 */
					.hotPotato::after {
						content: "";
						position: absolute;
						z-index: -1; /* Ensures this sits behind the .hotPotato background */
						top: -7px;
						left: -12px;
						width: 125px;
						height: 125px;
						border-radius: 50%;

						/* A simple radial gradient for a glow or flame-like effect */
						background: radial-gradient(
							circle,
							rgba(255, 165, 0, 0.5) 0%,
							rgba(255, 69, 0, 0.5) 70%,
							rgba(255, 140, 0, 0) 100%
						);
						filter: blur(3px);
						opacity: 0.8;

						/* Flicker animation (optional) */
						animation: flicker 1s infinite;
					}

					/* Example float animation */
					@keyframes float {
						0%,
						100% {
							transform: translateY(0);
						}
						50% {
							transform: translateY(-10px);
						}
					}

					/* Flicker or pulsing glow effect */
					@keyframes flicker {
						0% {
							transform: scale(1);
							opacity: 0.8;
						}
						50% {
							transform: scale(1.1);
							opacity: 1;
						}
						100% {
							transform: scale(1);
							opacity: 0.8;
						}
					}
				`}</style>
		</>
	);
}
