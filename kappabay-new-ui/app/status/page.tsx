"use client";

import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import AgentsTable from "@/components/agents-table";
import ManageGasDialog from "@/components/manage-gas-dialog";
import TransferAgentCapDialog from "@/components/transfer-agent-cap-dialog";
import Link from "next/link";
import { useEffect, useState } from "react";
import { startService, stopService } from "@/lib/actions/manage-docker-service";
import { PageTransition } from "@/components/page-transition";
import { motion } from "framer-motion";
import { useCurrentAccount, useWallet } from "@mysten/dapp-kit";
import { useOwnedCaps } from "@/hooks/use-owned-caps";
import { getAgentsByCapIds } from "@/lib/actions/get-agents-info";

export default function StatusPage() {
	const wallet = useCurrentAccount();
	const { signMessage } = useWallet();
	const [agents, setAgents] = useState<any>([]);
	const [totalGasBag, setTotalGasBag] = useState("1.25");
	const [withdrawAmount, setWithdrawAmount] = useState("");
	const [depositAmount, setDepositAmount] = useState("");
	const [loadingAgent, setLoadingAgent] = useState<string | null>(null);
	const [terminalEnabledAgents, setTerminalEnabledAgents] = useState<string[]>([]);
	const [transferDialogOpen, setTransferDialogOpen] = useState(false);
	const [transferAddress, setTransferAddress] = useState("");
	const [selectedCap, setSelectedCap] = useState("");
	const [gasDialogOpen, setGasDialogOpen] = useState(false);
	const [selectedAgentForGas, setSelectedAgentForGas] = useState<any>(null);
	const { caps } = useOwnedCaps();

	const handleOpenManageGas = (agent: any) => {
		setSelectedAgentForGas(agent);
		setGasDialogOpen(true);
	};

	const handleOpenTransferCap = (agent: any) => {
		setTransferDialogOpen(true);
		setSelectedCap(agent.capId);
	};

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
			// 1) build your auth payload
			const action = currentStatus === "ACTIVE" ? "stop_service" : "start_service";
			const timestamp = Date.now();
			const message = JSON.stringify({ agentId, action, timestamp });

			// 2) have the user sign it
			const encoder = new TextEncoder();
			const { signature, pubKey } = await signMessage({ message: encoder.encode(message) });

			// 3) call your server action with signature proof
			if (currentStatus === "ACTIVE") {
				await stopService(agentId, message, signature, pubKey, wallet.address);
			} else {
				await startService(agentId, message, signature, pubKey, wallet.address);
			}

			await refreshAgents();
		} catch (error) {
			console.error("Failed to update service status:", error);
		} finally {
			setLoadingAgent(null);
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
				/>
			)}

			<TransferAgentCapDialog
				open={transferDialogOpen}
				onOpenChange={setTransferDialogOpen}
				transferAddress={transferAddress}
				setTransferAddress={setTransferAddress}
				selectedCap={selectedCap}
				setSelectedCap={setSelectedCap}
				onTransferSuccess={() => setAgents((prev: any) => prev.filter((agent: any) => agent.capId !== selectedCap))}
			/>
		</main>
	);
}
