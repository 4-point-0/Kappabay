"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { useState } from "react";
import { useEffect } from "react";
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
}

export default function ManageGasDialog({
	open,
	onOpenChange,
	agent,
	depositAmount,
	setDepositAmount,
	withdrawAmount,
	setWithdrawAmount,
}: ManageGasDialogProps) {
	const wallet = useCurrentAccount();
	const signAndExecuteTransaction = useSignExecuteAndWaitForTransaction();

	// ── New state to hold on‐chain gas balance ───────────────────────────────
	const [gasBalance, setGasBalance] = useState<string>();

	// ── On mount / agent change: call the Move entry fun check_gas_balance ────
	useEffect(() => {
		if (!wallet?.address || !agent?.objectId) return;

		const tx = new Transaction();
		tx.moveCall({
			target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::check_gas_balance`,
			arguments: [tx.object(agent.objectId)],
		});

		signAndExecuteTransaction(tx)
			.then((result) => {
				const evt = (result.effects?.events || []).find((e: any) =>
					e.type?.endsWith("::agent::GasBalanceChecked")
				);
				if (evt && "parsedJson" in evt) {
					setGasBalance(evt.parsedJson.balance);
				}
			})
			.catch((e) => {
				console.error("check_gas_balance failed", e);
			});
	}, [agent.objectId, wallet?.address, signAndExecuteTransaction]);

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

	const handleWithdraw = async () => {
		if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) return;
		if (!wallet?.address) return;

		// Ensure withdraw amount doesn't exceed the agent's gas bag balance.
		if (Number(withdrawAmount) > Number(agent.gasBag)) return;

		try {
			// Convert withdraw amount from SUI to mist.
			const withdrawAmountMist = BigInt(Math.round(Number(withdrawAmount) * 1e9));

			// Get the adminCapId, agentAddress, presignedTxBytes, and agentSignature from backend.
			const { adminCapId, agentAddress, presignedTxBytes, agentSignature } = await withdrawGas(
				agent.id,
				withdrawAmountMist.toString(),
				agent.objectId,
				wallet.address
			);

			const tx = new Transaction();
			const coin: TransactionResult = tx.moveCall({
				target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::extract_gas_for_transaction`,
				arguments: [tx.object(agent.objectId), tx.object(adminCapId), tx.pure.u64(withdrawAmountMist.toString())],
			});
			tx.transferObjects([coin], wallet.address);
			tx.setSender(agentAddress);
			tx.setGasOwner(wallet.address);

			const walletSignedTx = await signTransaction({ transaction: tx });

			await suiClient
				.executeTransactionBlock({
					transactionBlock: presignedTxBytes,
					signature: [agentSignature, walletSignedTx.signature],
					requestType: "WaitForLocalExecution",
					options: {
						showEvents: true,
						showEffects: true,
						showObjectChanges: true,
						showBalanceChanges: true,
						showInput: true,
					},
				})
				.then((res) => {
					const status = res?.effects?.status.status;
					if (status === "success") {
						toast({
							title: "Withdraw Successful",
							description: "Withdraw transaction executed successfully. Transaction digest: " + res?.digest,
						});
						// Optionally trigger a refresh here if needed.
					} else if (status === "failure") {
						toast({
							title: "Withdraw Error",
							description: "Withdraw transaction failed.",
							variant: "destructive",
						});
						console.error("Error =", res?.effects);
					}
				})
				.catch((error) => {
					console.error("Error executing sponsored transaction:", error);
					toast({
						title: "Withdraw Failed",
						description: "Withdraw transaction failed.",
						variant: "destructive",
					});
				});
		} catch (error) {
			console.error("Error in withdrawGas:", error);
			toast({
				title: "Withdraw Error",
				description: "Error while executing the withdraw operation.",
				variant: "destructive",
			});
		} finally {
			setWithdrawAmount("");
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Manage Gas Bag</DialogTitle>
					<DialogDescription>Add or withdraw SUI from this agent's gas bag.</DialogDescription>
				</DialogHeader>

				{/* ── NEW: display current on-chain gas balance ─────────────────────── */}
				<div className="px-4 py-2 bg-background border rounded mb-4 text-sm flex justify-between">
					<span>Current Gas Balance:</span>
					<span className="font-medium">
						{gasBalance ? `${(Number(gasBalance) / 1e9).toFixed(3)} SUI` : "Loading..."}
					</span>
				</div>

				<div className="grid gap-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="deposit">Deposit SUI</Label>
						<div className="flex items-center gap-2">
							<Input
								id="deposit"
								type="number"
								step="0.01"
								min="0"
								placeholder="Amount"
								value={depositAmount}
								onChange={(e) => setDepositAmount(e.target.value)}
							/>
							<Button onClick={handleDeposit}>Deposit</Button>
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="withdraw">Withdraw SUI</Label>
						<div className="flex items-center gap-2">
							<Input
								id="withdraw"
								type="number"
								step="0.01"
								min="0"
								max={agent?.gasBag || ""}
								placeholder="Amount"
								value={withdrawAmount}
								onChange={(e) => setWithdrawAmount(e.target.value)}
							/>
							<Button onClick={handleWithdraw}>Withdraw</Button>
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
