"use client";

import { useState, useEffect } from "react";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import AgentsTable from "@/components/agents-table";
import ManageGasDialog from "@/components/manage-gas-dialog";
import TransferAgentCapDialog from "@/components/transfer-agent-cap-dialog";
import Link from "next/link";
import { useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit";
import { useOwnedCaps } from "@/hooks/use-owned-caps";
import { getAgentsByCapIds } from "@/lib/actions/get-agents-info";
import { startService, stopService } from "@/lib/actions/manage-docker-service";
import { PageTransition } from "@/components/page-transition";
import { motion } from "framer-motion";

export default function WaifuStatusPage() {
	const wallet = useCurrentAccount();
	const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
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

	const refreshAgents = async () => {
		const capIds = caps.filter((c: any) => c.data).map((c: any) => c.data.objectId);
		if (capIds.length === 0) {
			setAgents([]);
			return;
		}
		try {
			const fetched = await getAgentsByCapIds(capIds);
			console.log(fetched);

			setAgents(fetched.filter((agent) => agent.agentType === "kappabay-create") ?? []);
		} catch (e) {
			console.error("Error fetching agents:", e);
		}
	};

	useEffect(() => {
		if (!wallet?.address) {
			setAgents([]);
			return;
		}
		refreshAgents();
	}, [wallet?.address, caps]);

	useEffect(() => {
		const timers = agents
			.filter((a) => a.status === "ACTIVE")
			.map((agent) =>
				setTimeout(() => {
					setTerminalEnabledAgents((prev) => (prev.includes(agent.id) ? prev : [...prev, agent.id]));
				}, 3000)
			);
		return () => timers.forEach(clearTimeout);
	}, [agents]);

	const handleService = async (agentId: string, currentStatus: string) => {
		if (!wallet?.address) return;
		setLoadingAgent(agentId);
		try {
			const action = currentStatus === "ACTIVE" ? "stop_service" : "start_service";
			const timestamp = Date.now();
			const message = JSON.stringify({ agentId, action, timestamp });
			const encoder = new TextEncoder();
			const { signature } = await signPersonalMessage({ message: encoder.encode(message) });
			if (currentStatus === "ACTIVE") {
				await stopService(agentId, message, signature, wallet.address);
			} else {
				await startService(agentId, message, signature, wallet.address);
			}
			await refreshAgents();
		} catch (e) {
			console.error("Failed to toggle service:", e);
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
							<h1 className="text-3xl font-bold">My Waifus</h1>
							<p className="text-muted-foreground mt-2">Manage your digital companions</p>
						</div>
						<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
							<Link href="/kappabay/create">
								<Button>Create New Companion</Button>
							</Link>
						</motion.div>
					</div>

					<AgentsTable
						agents={agents}
						loadingAgent={loadingAgent}
						terminalEnabledAgents={terminalEnabledAgents}
						onServiceToggle={handleService}
						onOpenManageGas={openManageGas}
						onOpenTransferCap={openTransferCap}
						// override the column header label:
						moneyLabel="Pocket Money"
					/>
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
