"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useState } from "react";
import { useCurrentAccount, useSignTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { toast } from "@/hooks/use-toast";
import { withdrawGas } from "@/lib/actions/withdraw-gas";
import { useSignExecuteAndWaitForTransaction } from "@/hooks/use-sign";

interface ManageGasDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	agent: any;
	depositAmount: string;
	setDepositAmount: (val: string) => void;
	withdrawAmount: string;
	setWithdrawAmount: (val: string) => void;
	withdrawToAgentAmount: string;
	setWithdrawToAgentAmount: (val: string) => void;
}

// ─── constants for uniform sizing ──────────────────────────────────────────
const FIELD_WIDTH = "w-72"; // same width on all inputs
const BUTTON_WIDTH = "w-32"; // same width on all buttons

export default function ManageGasDialog({
	open,
	onOpenChange,
	agent,
	depositAmount,
	setDepositAmount,
	withdrawAmount,
	setWithdrawAmount,
	withdrawToAgentAmount,
	setWithdrawToAgentAmount,
}: ManageGasDialogProps) {
	const wallet = useCurrentAccount();
	const signAndExecuteTransaction = useSignExecuteAndWaitForTransaction();
	const [isExecuting, setIsExecuting] = useState(false);

	const handleDeposit = async () => {
		if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) return;
		if (!wallet?.address) return;

		try {
			const txn = new Transaction();
			// Convert deposit amount from SUI to mist (1 SUI = 1e9 mist)
			const depositAmountMist = BigInt(Math.round(Number(depositAmount) * 1e9));
			// Split the gas coin to obtain the payment coin for the deposit.
			const payment = txn.splitCoins(txn.gas, [txn.pure.u64(depositAmountMist.toString())])[0];

			txn.moveCall({
				target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::deposit_gas`,
				arguments: [txn.object(agent.objectId), payment],
			});

			signAndExecuteTransaction(txn)
				.then((result) => {
					toast({
						title: "Deposit Successful",
						description: "Deposit executed.",
					});
					// Optionally trigger a refresh here if needed.
				})
				.catch((error) => {
					console.error("Deposit move call failed:", error);
					toast({
						title: "Deposit Failed",
						description: "Deposit transaction failed.",
						variant: "destructive",
					});
				});
		} catch (error) {
			console.error("Error in handleDeposit:", error);
			toast({
				title: "Deposit Error",
				description: "Error in deposit execution.",
				variant: "destructive",
			});
		} finally {
			setDepositAmount("");
		}
	};

	const { mutateAsync: signTransaction } = useSignTransaction();
	const suiClient = useSuiClient();

	/**
	 * Core extract-gas flow. If `transferToWallet` is true we
	 * will `tx.transferObjects`, otherwise we leave the coin in the agent.
	 */
	const executeExtractGas = async (
		amountStr: string,
		transferToWallet: boolean
	) => {
		// basic validation
		if (!amountStr || isNaN(Number(amountStr)) || Number(amountStr) <= 0) return;
		if (!wallet?.address) return;
		if (Number(amountStr) > Number(agent.gasBag)) return;

		try {
			const amountMist = BigInt(Math.round(Number(amountStr) * 1e9));
			const { adminCapId, agentAddress, presignedTxBytes, agentSignature } = await withdrawGas(
				agent.id,
				amountMist.toString(),
				agent.objectId,
				wallet.address
			);

			const tx = new Transaction();
			const coin = tx.moveCall({
				target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::extract_gas_for_transaction`,
				arguments: [tx.object(agent.objectId), tx.object(adminCapId), tx.pure.u64(amountMist.toString())],
			});
			if (transferToWallet) {
				tx.transferObjects([coin], wallet.address);
			}
			tx.setSender(agentAddress);
			tx.setGasOwner(wallet.address);

			const walletSig = await signTransaction({ transaction: tx });
			const res = await suiClient.executeTransactionBlock({
				transactionBlock: presignedTxBytes,
				signature: [agentSignature, walletSig.signature],
				requestType: "WaitForLocalExecution",
				options: {
					showEvents: true,
					showEffects: true,
					showObjectChanges: true,
					showBalanceChanges: true,
					showInput: true,
				},
			});

			const success = res?.effects?.status.status === "success";
			toast({
				title: success
					? transferToWallet
						? "Withdraw Successful"
						: "Withdraw to Agent Successful"
					: transferToWallet
					? "Withdraw Failed"
					: "Withdraw to Agent Failed",
				description: success
					? transferToWallet
						? `Withdrew ${amountStr} SUI`
						: `Extracted ${amountStr} SUI into agent’s wallet.`
					: undefined,
				variant: success ? undefined : "destructive",
			});
		} catch (err) {
			console.error("Error in extract-gas flow:", err);
			toast({
				title: transferToWallet ? "Withdraw Error" : "Withdraw to Agent Error",
				description: "Unexpected error.",
				variant: "destructive",
			});
		} finally {
			transferToWallet ? setWithdrawAmount("") : setWithdrawToAgentAmount("");
		}
	};

	// now simply delegate
	const handleWithdraw = () => executeExtractGas(withdrawAmount, true);
	const handleWithdrawToAgentAccount = () => executeExtractGas(withdrawToAgentAmount, false);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Manage Gas Bag</DialogTitle>
					<DialogDescription>Add or withdraw SUI from this agent's gas bag.</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="deposit">Deposit SUI</Label>
						<div className="flex items-center justify-between">
							<Input
								id="deposit"
								type="number"
								step="0.01"
								min="0"
								placeholder="Amount"
								value={depositAmount}
								onChange={(e) => setDepositAmount(e.target.value)}
								className={FIELD_WIDTH}
							/>
							<Button onClick={handleDeposit} className={BUTTON_WIDTH}>
								Deposit SUI
							</Button>
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="withdraw">Withdraw SUI</Label>
						<div className="flex items-center justify-between">
							<Input
								id="withdraw"
								type="number"
								step="0.01"
								min="0"
								max={agent?.gasBag || ""}
								placeholder="Amount"
								value={withdrawAmount}
								onChange={(e) => setWithdrawAmount(e.target.value)}
								className={FIELD_WIDTH}
							/>
							<Button onClick={handleWithdraw} className={BUTTON_WIDTH}>
								Withdraw SUI
							</Button>
						</div>
					</div>
					{/* ↓ new “to agent” withdraw */}
					<div className="space-y-2">
						<Label htmlFor="withdraw-agent">Withdraw to Agent Wallet</Label>
						<div className="flex items-center justify-between">
							<Input
								id="withdraw-agent"
								type="number"
								step="0.01"
								min="0"
								max={agent?.gasBag || ""}
								placeholder="Amount"
								value={withdrawToAgentAmount}
								onChange={(e) => setWithdrawToAgentAmount(e.target.value)}
								className={FIELD_WIDTH}
							/>
							<Button onClick={handleWithdrawToAgentAccount} className={BUTTON_WIDTH}>
								Extract SUI
							</Button>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
