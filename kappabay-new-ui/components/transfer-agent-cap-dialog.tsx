"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { toast } from "@/hooks/use-toast";
import { Label } from "./ui/label";
import { Button } from "./ui/button";

interface TransferAgentCapDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	transferAddress: string;
	setTransferAddress: (val: string) => void;
	selectedCap: string;
	setSelectedCap: (val: string) => void;
	caps: any[];
	onTransferSuccess?: () => Promise<void> | void;
}

const formatObjectId = (objectId: string) => {
	return `${objectId.slice(0, 6)}...${objectId.slice(-4)}`;
};

export default function TransferAgentCapDialog({
	open,
	onOpenChange,
	transferAddress,
	setTransferAddress,
	selectedCap,
	setSelectedCap,
	caps,
}: TransferAgentCapDialogProps) {
	const wallet = useCurrentAccount();
	const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

	const handleTransfer = async () => {
		if (!transferAddress || !selectedCap || !wallet?.address) {
			toast({
				title: "Transfer Error",
				description: "Please provide both a recipient address and select a cap.",
				variant: "destructive",
			});
			return;
		}

		try {
			const tx = new Transaction();
			tx.transferObjects([tx.object(selectedCap)], transferAddress);
			tx.setSender(wallet.address);
			tx.setGasOwner(wallet.address);

			signAndExecuteTransaction(
				{ transaction: tx },
				{
					onSuccess: async (result) => {
						console.log("Transfer transaction:", result);
						toast({
							title: "Transfer Successful",
							description: "Agent cap has been transferred.",
						});
					},
					onError: (error) => {
						console.error("Transfer move call failed:", error);
						toast({
							title: "Transfer Failed",
							description: "The agent cap transfer could not be completed.",
							variant: "destructive",
						});
					},
				}
			);
		} catch (error) {
			console.error("Transfer failed", error);
			toast({
				title: "Transfer Failed",
				description: "The agent cap transfer could not be completed.",
				variant: "destructive",
			});
		} finally {
			onOpenChange(false);
			setTransferAddress("");
			setSelectedCap("");
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Transfer Agent Cap</DialogTitle>
					<DialogDescription>Enter the recipient Sui address and choose an Agent Cap to transfer.</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="transfer-address">Recipient Sui Address</Label>
						<Input
							id="transfer-address"
							type="text"
							placeholder="Enter Sui Address"
							value={transferAddress}
							onChange={(e) => setTransferAddress(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="agent-cap">Agent Cap</Label>
						<Input
							id="agent-cap"
							type="text"
							value={selectedCap ? formatObjectId(selectedCap) : ""}
							disabled
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleTransfer}>Send</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
