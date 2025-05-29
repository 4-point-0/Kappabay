"use client";

import { useState, useEffect } from "react";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import AgentsTable from "@/components/agents-table";
import ManageGasDialog from "@/components/manage-gas-dialog";
import TransferAgentCapDialog from "@/components/transfer-agent-cap-dialog";
import Link from "next/link";
import { useCurrentAccount, useSignPersonalMessage, useSuiClient } from "@mysten/dapp-kit";
import { getObjectFields } from "@/lib/actions/sui-utils";
import { useOwnedCaps } from "@/hooks/use-owned-caps";
import { getAgentsByCapIds } from "@/lib/actions/get-agents-info";
import { startService, stopService } from "@/lib/actions/manage-docker-service";
import { PageTransition } from "@/components/page-transition";
import { motion } from "framer-motion";

interface StatusContentProps {
	/** href for the “Create” button */
	createHref: string;
	/** label for the “Create” button */
	createButtonText: string;
	/** column header for the gas balance */
	moneyLabel?: string;
	/** optional filter on agentType */
	filterByAgentType?: string;
}

export function StatusContent({
	createHref,
	createButtonText,
	moneyLabel = "Gas Bag",
	filterByAgentType,
}: StatusContentProps) {
	const wallet = useCurrentAccount();
	const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
	const suiClient = useSuiClient();
	const { caps } = useOwnedCaps();

	const [agents, setAgents] = useState<any[]>([]);
	const [withdrawAmount, setWithdrawAmount] = useState("");
	const [depositAmount, setDepositAmount] = useState("");
	const [loadingAgent, setLoadingAgent] = useState<string | null>(null);
	const [terminalEnabledAgents, setTerminalEnabledAgents] = useState<string[]>([]);
	const [gasDialogOpen, setGasDialogOpen] = useState(false);
	const [transferDialogOpen, setTransferDialogOpen] = useState(false);
	const [selectedAgentForGas, setSelectedAgentForGas] = useState<any>(null);
	const [selectedCap, setSelectedCap] = useState("");
	const [transferAddress, setTransferAddress] = useState("");

	// Fetch & optionally filter agents:
	async function refreshAgents() {
		const capIds = caps
			.filter((c: any) => c.data && c.data.type.includes("::agent::AgentCap"))
			.map((c: any) => c.data.objectId);
		try {
			let list = (await getAgentsByCapIds(capIds)) || [];
			if (filterByAgentType) {
				list = list.filter((a) => a.agentType === filterByAgentType);
			}
			// ── batch-fetch on-chain gas_tank for each agent and convert to SUI ──
			const balances = await Promise.all(
				list.map(async (a) => ({
					id: a.id,
					gasTank: (await getObjectFields(suiClient, a.objectId)).gas_tank,
				}))
			);
			const enriched = list.map((a) => {
				const match = balances.find((b) => b.id === a.id);
				const bag = match ? (Number(match.gasTank) / 1e9).toFixed(5) : "0.000";
				return { ...a, gasBag: bag };
			});
			setAgents(enriched);
		} catch (err) {
			console.error("Error fetching agents:", err);
		}
	}

	useEffect(() => {
		if (!wallet?.address) return;
		refreshAgents();
	}, [wallet?.address, caps]);

	// enable terminal buttons after load
	useEffect(() => {
		const timers = agents.map((agent) => {
			if (agent.status === "ACTIVE") {
				return setTimeout(() => {
					setTerminalEnabledAgents((prev) => (prev.includes(agent.id) ? prev : [...prev, agent.id]));
				}, 5000);
			} else {
				setTerminalEnabledAgents((prev) => prev.filter((id) => id !== agent.id));
				return null;
			}
		});
		return () => timers.forEach((t) => t && clearTimeout(t));
	}, [agents]);

	// start/stop service handler
	const handleService = async (agentId: string, currentStatus: string) => {
		if (!wallet?.address) return;
		setLoadingAgent(agentId);
		try {
			const action = currentStatus === "ACTIVE" ? "stop_service" : "start_service";
			const message = JSON.stringify({ agentId, action, timestamp: Date.now() });
			const encoder = new TextEncoder();
			const { signature } = await signPersonalMessage({ message: encoder.encode(message) });
			if (action === "stop_service") {
				await stopService(agentId, message, signature, wallet.address);
			} else {
				await startService(agentId, message, signature, wallet.address);
			}
			await refreshAgents();
		} catch (err) {
			console.error("Service toggle failed:", err);
		} finally {
			setLoadingAgent(null);
		}
	};

	const openManageGas = (agent: any) => {
		setSelectedAgentForGas(agent);
		setGasDialogOpen(true);
	};
	const openTransferCap = (agent: any) => {
		setSelectedCap(agent.capId);
		setTransferDialogOpen(true);
	};

	return (
		<main className="min-h-screen bg-background text-foreground">
			<Header />
			<PageTransition>
				<div className="container mx-auto px-4 py-8">
					<div className="flex justify-between items-center mb-8">
						<div>
							<h1 className="text-3xl font-bold">{createButtonText.replace(/ .*/, "")}</h1>
							<p className="text-muted-foreground mt-2">Manage your deployed AI agents</p>
						</div>
						<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
							<Link href={createHref}>
								<Button>{createButtonText}</Button>
							</Link>
						</motion.div>
					</div>
					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
						<AgentsTable
							agents={agents}
							loadingAgent={loadingAgent}
							terminalEnabledAgents={terminalEnabledAgents}
							onServiceToggle={handleService}
							onOpenManageGas={openManageGas}
							onOpenTransferCap={openTransferCap}
							moneyLabel={moneyLabel}
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
				onTransferSuccess={() => setAgents((prev) => prev.filter((a) => a.capId !== selectedCap))}
			/>
		</main>
	);
}
