"use client";

import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, Pause, RefreshCw, Settings, Terminal, Wallet, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useOwnedCaps } from "@/hooks/use-owned-caps";
import { getAgentsByCapIds } from "@/lib/actions/get-agents-info";

export default function StatusPage() {
	const wallet = useCurrentAccount();
	const [agents, setAgents] = useState<any>([]);
	const [totalGasBag, setTotalGasBag] = useState("1.25");
	const [withdrawAmount, setWithdrawAmount] = useState("");
	const [depositAmount, setDepositAmount] = useState("");
	const [selectedAgentId, setSelectedAgentId] = useState("");
	const [loadingAgent, setLoadingAgent] = useState<string | null>(null);
	const [terminalEnabledAgents, setTerminalEnabledAgents] = useState<string[]>([]);

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
		if (!wallet?.address) return;
		refreshAgents();
	}, [wallet]);

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

	const handleDeposit = () => {
		if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) return;

		// Update the selected agent's gas bag
		setAgents(
			agents.map((agent: any) =>
				agent.id === selectedAgentId
					? { ...agent, gasBag: (Number(agent.gasBag) + Number(depositAmount)).toFixed(2) }
					: agent
			)
		);

		// Update total gas bag
		setTotalGasBag((Number(totalGasBag) - Number(depositAmount)).toFixed(2));
		setDepositAmount("");
	};

	const handleWithdraw = () => {
		if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) return;

		// Find the selected agent
		const agent = agents.find((a: any) => a.id === selectedAgentId);
		if (!agent || Number(withdrawAmount) > Number(agent.gasBag)) return;

		// Update the selected agent's gas bag
		setAgents(
			agents.map((agent: any) =>
				agent.id === selectedAgentId
					? { ...agent, gasBag: (Number(agent.gasBag) - Number(withdrawAmount)).toFixed(2) }
					: agent
			)
		);

		// Update total gas bag
		setTotalGasBag((Number(totalGasBag) + Number(withdrawAmount)).toFixed(2));
		setWithdrawAmount("");
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
						<Card>
							<CardContent className="p-6">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Agent Name</TableHead>
											<TableHead>Object ID</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Gas Bag</TableHead>
											<TableHead>Created</TableHead>
											<TableHead>Last Active</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{agents.map((agent: any, index: number) => (
											<motion.tr
												key={agent.id}
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{ duration: 0.3, delay: index * 0.1 }}
												className="border-b border-border"
											>
												<TableCell className="font-medium">{agent.name}</TableCell>
												<TableCell className="font-mono text-xs">{agent.id}</TableCell>
												<TableCell>
													<Badge variant={agent.status === "ACTIVE" ? "default" : "outline"}>
														{agent.status === "ACTIVE" ? "Active" : "Inactive"}
													</Badge>
												</TableCell>
												<TableCell>
													<div className="flex items-center">
														<span className="mr-2">{agent.gasBag} SUI</span>
														<Dialog>
															<DialogTrigger asChild>
																<Button
																	variant="outline"
																	size="icon"
																	className="h-6 w-6"
																	onClick={() => setSelectedAgentId(agent.id)}
																>
																	<Wallet className="h-3 w-3" />
																</Button>
															</DialogTrigger>
															<DialogContent>
																<DialogHeader>
																	<DialogTitle>Manage Gas Bag</DialogTitle>
																	<DialogDescription>Add or withdraw SUI from this agent's gas bag.</DialogDescription>
																</DialogHeader>
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
																				max={agent.gasBag}
																				placeholder="Amount"
																				value={withdrawAmount}
																				onChange={(e) => setWithdrawAmount(e.target.value)}
																			/>
																			<Button onClick={handleWithdraw}>Withdraw</Button>
																		</div>
																	</div>
																</div>
																<DialogFooter>
																	<Button variant="outline" type="button">
																		Close
																	</Button>
																</DialogFooter>
															</DialogContent>
														</Dialog>
													</div>
												</TableCell>
												<TableCell>{new Date(agent.createdAt).toLocaleString()}</TableCell>
												<TableCell>{agent.lastActive}</TableCell>
												<TableCell className="text-right">
													<div className="flex justify-end space-x-2">
														<motion.div
															whileHover={{
																scale: agent.status === "ACTIVE" && terminalEnabledAgents.includes(agent.id) ? 1.1 : 1,
															}}
															whileTap={{
																scale: agent.status === "ACTIVE" && terminalEnabledAgents.includes(agent.id) ? 0.9 : 1,
															}}
														>
															{agent.status === "ACTIVE" ? (
																terminalEnabledAgents.includes(agent.id) ? (
																	<Link href={`/terminal/${agent.id}`}>
																		<Button variant="outline" size="icon" title="Open Terminal">
																			<Terminal className="h-4 w-4" />
																		</Button>
																	</Link>
																) : (
																	<Button variant="outline" size="icon" title="Enabling Terminal..." disabled>
																		<Loader2 className="h-4 w-4 animate-spin" />
																	</Button>
																)
															) : (
																<Button variant="outline" size="icon" title="Terminal unavailable" disabled>
																	<Terminal className="h-4 w-4 opacity-50" />
																</Button>
															)}
														</motion.div>
														<motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
															<Button
																variant="outline"
																size="icon"
																onClick={() => handleService(agent.id, agent.status)}
															>
																{loadingAgent === agent.id ? (
																	<Loader2 className="h-4 w-4 animate-spin" />
																) : agent.status === "ACTIVE" ? (
																	<Pause className="h-4 w-4" />
																) : (
																	<Play className="h-4 w-4" />
																)}
															</Button>
														</motion.div>
														<motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
															<Button variant="outline" size="icon">
																<RefreshCw className="h-4 w-4" />
															</Button>
														</motion.div>
														<motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
															<Link href={`/configure/${agent.id}`}>
																<Button variant="outline" size="icon">
																	<Settings className="h-4 w-4" />
																</Button>
															</Link>
														</motion.div>
													</div>
												</TableCell>
											</motion.tr>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</motion.div>
				</div>
			</PageTransition>
		</main>
	);
}
