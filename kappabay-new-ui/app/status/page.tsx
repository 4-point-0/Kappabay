"use client";

import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AgentsTable from "@/components/agents-table";
import ManageGasDialog from "@/components/manage-gas-dialog";
import TransferAgentCapDialog from "@/components/transfer-agent-cap-dialog";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSignAndExecuteTransaction, useSignTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { startService, stopService } from "@/lib/actions/manage-docker-service";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTransition } from "@/components/page-transition";
import { motion } from "framer-motion";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useToast } from "@/components/ui/use-toast";
import { useOwnedCaps } from "@/hooks/use-owned-caps";
import { getAgentsByCapIds } from "@/lib/actions/get-agents-info";
import { toast } from "@/hooks/use-toast";
import { withdrawGas } from "@/lib/actions/withdrawGas";

const formatObjectId = (objectId: string) => {
	// Display the first 6 and last 4 characters
	return `${objectId.slice(0, 6)}...${objectId.slice(-4)}`;
};

export default function StatusPage() {
	const wallet = useCurrentAccount();
	const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
	const { mutateAsync: signTransaction } = useSignTransaction();
	const [agents, setAgents] = useState<any>([]);
	const [totalGasBag, setTotalGasBag] = useState("1.25");
	const [withdrawAmount, setWithdrawAmount] = useState("");
	const [depositAmount, setDepositAmount] = useState("");
	const [selectedAgentId, setSelectedAgentId] = useState("");
	const [loadingAgent, setLoadingAgent] = useState<string | null>(null);
	const [terminalEnabledAgents, setTerminalEnabledAgents] = useState<string[]>([]);
	const [transferDialogOpen, setTransferDialogOpen] = useState(false);
	const [transferAddress, setTransferAddress] = useState("");
	const [selectedCap, setSelectedCap] = useState("");
	const [gasDialogOpen, setGasDialogOpen] = useState(false);
	const [selectedAgentForGas, setSelectedAgentForGas] = useState<any>(null);

	const suiClient = useSuiClient();

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
			// Call the transfer move function – adjust the target if needed on the Move side.
			tx.moveCall({
				target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::transfer_cap`,
				arguments: [tx.object(selectedCap), tx.pure.address(transferAddress)],
			});
			tx.setSender(wallet.address);
			tx.setGasOwner(wallet.address);

			signAndExecuteTransaction(
				{ transaction: tx },
				{
					onSuccess: async (result) => {
						console.log("Deposit transaction:", result);
						toast({
							title: "Transfer Successful",
							description: "Agent cap has been transferred.",
						});
						await refreshAgents();
					},
					onError: (error) => {
						console.error("Deposit move call failed:", error);
						toast({
							title: "Transfer Failed",
							description: "The agent cap transfer could not be completed.",
							variant: "destructive",
						});
					},
				}
			);

			toast({});
		} catch (error) {
			console.error("Transfer failed", error);
			toast({
				title: "Transfer Failed",
				description: "The agent cap transfer could not be completed.",
				variant: "destructive",
			});
		} finally {
			setTransferDialogOpen(false);
			setTransferAddress("");
			setSelectedCap("");
		}
	};

	const handleOpenManageGas = (agent: any) => {
		setSelectedAgentForGas(agent);
		setGasDialogOpen(true);
	};

	const handleOpenTransferCap = (agent: any) => {
		setTransferDialogOpen(true);
	};

	const { caps, isLoading: capsLoading, error: capsError } = useOwnedCaps();

	async function refreshAgents() {
		let allAgents: any[] = [];
		// Collect all valid cap IDs from caps
		const capIds = caps.filter((cap: any) => cap.data).map((cap: any) => cap.data.objectId);
		if (capIds.length > 0) {
			try {
				// Make a single HTTP call with the array of capIds
				const agentsForCaps = await getAgentsByCapIds(capIds);
				if (agentsForCaps && agentsForCaps.length > 0) {
					allAgents = agentsForCaps;
				}
			} catch (error) {
				console.error("Error fetching agents for capIds", capIds, error);
			}
		}
		setAgents(allAgents);
	}

	useEffect(() => {
		if (!wallet?.address) {
			agents.length > 0 && setAgents([]);
			return;
		}
		refreshAgents();
	}, [wallet?.address, caps]);

	useEffect(() => {
		const timers = agents
			.map((agent: any) => {
				if (agent.status === "ACTIVE") {
					// Schedule enabling terminal for active agents after 3 seconds:
					return setTimeout(() => {
						setTerminalEnabledAgents((prev) => {
							if (!prev.includes(agent.id)) {
								return [...prev, agent.id];
							}
							return prev;
						});
					}, 3000);
				} else {
					// Immediately remove inactive agents:
					setTerminalEnabledAgents((prev) => prev.filter((id) => id !== agent.id));
					return null;
				}
			})
			.filter(Boolean) as NodeJS.Timeout[];

		return () => {
			timers.forEach((timer) => clearTimeout(timer));
		};
	}, [agents]);

	const handleService = async (agentId: string, currentStatus: string) => {
		if (!wallet?.address) return;
		setLoadingAgent(agentId);
		try {
			if (currentStatus === "ACTIVE") {
				await stopService(agentId);
			} else {
				await startService(agentId);
			}
			await refreshAgents();
		} catch (error) {
			console.error(`Failed to update service status for agent ${agentId}:`, error);
		} finally {
			setLoadingAgent(null);
		}
	};

	const handleDeposit = async () => {
		if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) return;
		if (!wallet?.address) return;

		// Find the selected agent (using the agent's objectId)
		const selectedAgent = agents.find((agent: any) => agent.id === selectedAgentId);
		if (!selectedAgent) return;

		try {
			// Create a new transaction.
			const txn = new Transaction();

			// Convert deposit amount from SUI to mist (1 SUI = 1e9 mist)
			const depositAmountMist = BigInt(Math.round(Number(depositAmount) * 1e9));

			// Split the gas coin to obtain the payment coin for the deposit (using the mist amount).
			const payment = txn.splitCoins(txn.gas, [txn.pure.u64(depositAmountMist.toString())])[0];

			// Include the move call with the payment coin.
			txn.moveCall({
				target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::deposit_gas`,
				arguments: [txn.object(selectedAgent.objectId), payment],
			});

			signAndExecuteTransaction(
				{ transaction: txn },
				{
					onSuccess: async (result) => {
						console.log("Deposit transaction:", result);
						toast({
							title: "Deposit Successful",
							description: "Deposit transaction executed successfully.",
						});
						await refreshAgents();
					},
					onError: (error) => {
						console.error("Deposit move call failed:", error);
						toast({
							title: "Deposit Failed",
							description: "Deposit transaction failed.",
							variant: "destructive",
						});
					},
				}
			);
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

	const handleWithdraw = async () => {
		if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) return;
		if (!wallet?.address) return;

		// Find the selected agent
		const agent = agents.find((a: any) => a.id === selectedAgentId);
		if (!agent || Number(withdrawAmount) > Number(agent.gasBag)) return;

		try {
			// Convert withdraw amount from SUI to mist
			const withdrawAmountMist = BigInt(Math.round(Number(withdrawAmount) * 1e9));

			// Get the adminCapId, agentAddress, and pre-signed transaction bytes from the backend
			const { adminCapId, agentAddress, presignedTxBytes, agentSignature } = await withdrawGas(
				agent.id,
				withdrawAmountMist.toString(),
				agent.objectId,
				wallet.address
			);
			// Build the transaction block using the move call with extract_gas_for_transaction
			const tx = new Transaction();
			const coin: TransactionResult = tx.moveCall({
				target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::extract_gas_for_transaction`,
				arguments: [tx.object(agent.objectId), tx.object(adminCapId), tx.pure.u64(withdrawAmountMist.toString())],
			});
			// Capture the returned coin object and add a transfer call in the same tx block
			tx.transferObjects([coin], wallet.address);

			tx.setSender(agentAddress);
			tx.setGasOwner(wallet.address);

			// Now, have the connected wallet sign the transaction block.
			const walletSignedTx = await signTransaction({ transaction: tx });

			// Execute the transaction block using the SuiClient directly and pass both signatures.
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
						refreshAgents();
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
		<main className="min-h-screen bg-background text-foreground">
			<Header />
			<PageTransition>
				<div className="container mx-auto px-4 py-8">
					<div className="flex justify-between items-center mb-8">
						<div>
							<h1 className="text-3xl font-bold">My Agents</h1>
							<p className="text-muted-foreground mt-2">Manage your deployed AI agents</p>
						</div>
						<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
							<Link href="/deploy">
								<Button>Deploy New Agent</Button>
							</Link>
						</motion.div>
					</div>

					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
						<AgentsTable
							agents={agents}
							loadingAgent={loadingAgent}
							terminalEnabledAgents={terminalEnabledAgents}
							onServiceToggle={handleService}
							onOpenManageGas={handleOpenManageGas}
							onOpenTransferCap={handleOpenTransferCap}
						/>
					</motion.div>
				</div>
			</PageTransition>
			{gasDialogOpen && selectedAgentForGas && (
				<ManageGasDialog
					open={gasDialogOpen}
					onOpenChange={setGasDialogOpen}
					agent={selectedAgentForGas}
					depositAmount={depositAmount}
					setDepositAmount={setDepositAmount}
					withdrawAmount={withdrawAmount}
					setWithdrawAmount={setWithdrawAmount}
					onDeposit={handleDeposit}
					onWithdraw={handleWithdraw}
				/>
			)}

			<TransferAgentCapDialog
				open={transferDialogOpen}
				onOpenChange={setTransferDialogOpen}
				transferAddress={transferAddress}
				setTransferAddress={setTransferAddress}
				selectedCap={selectedCap}
				setSelectedCap={setSelectedCap}
				caps={caps}
				onSend={handleTransfer}
			/>
		</main>
	);
}
