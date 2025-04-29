"use client";

import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, Pause, RefreshCw, Settings, Terminal, Wallet } from "lucide-react";
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
import { getAgentsByOwner } from "@/lib/actions/get-agents-info";

// // Mock data for owned agents
// const initialAgents = [
// 	{
// 		id: "0x1a2b3c4d5e6f7g8h9i0j",
// 		name: "Financial Advisor",
// 		status: "active",
// 		created: "2023-04-15",
// 		lastActive: "2023-04-24",
// 		gasBag: "0.25",
// 	},
// 	{
// 		id: "0x9i8h7g6f5e4d3c2b1a0",
// 		name: "News Aggregator",
// 		status: "inactive",
// 		created: "2023-03-10",
// 		lastActive: "2023-04-20",
// 		gasBag: "0.10",
// 	},
// 	{
// 		id: "0x2b3c4d5e6f7g8h9i0j1a",
// 		name: "Crypto Market Analyst",
// 		status: "active",
// 		created: "2023-04-01",
// 		lastActive: "2023-04-24",
// 		gasBag: "0.50",
// 	},
// ];

export default function StatusPage() {
	const wallet = useCurrentAccount();
	const [agents, setAgents] = useState<any>([]);
	const [totalGasBag, setTotalGasBag] = useState("1.25");
	const [withdrawAmount, setWithdrawAmount] = useState("");
	const [depositAmount, setDepositAmount] = useState("");
	const [selectedAgentId, setSelectedAgentId] = useState("");

	const { caps, isLoading: capsLoading, error: capsError } = useOwnedCaps();

	useEffect(() => {
		async function fetchAgentsByCaps() {
			if (caps.length > 0) {
				let allAgents: any[] = [];
				for (const cap of caps) {
					try {
						// Assume the capability ID is accessible as cap.data.objectId
						const agentsForCap = await getAgentsByOwner(cap.data.objectId);
						if (agentsForCap && agentsForCap.length > 0) {
							allAgents = [...allAgents, ...agentsForCap];
						}
					} catch (error) {
						console.error("Error fetching agents for cap", cap.data.objectId, error);
					}
				}
				setAgents(allAgents);
			}
		}

		fetchAgentsByCaps();
	}, [caps]);

	const handleService = async (agentId: string, currentStatus: string) => {
		if (!wallet?.address) return;
		try {
			if (currentStatus === "ACTIVE") {
				await stopService(agentId);
			} else {
				await startService(agentId);
			}
			const updatedAgents = await getAgentsByOwner(wallet.address);
			setAgents(updatedAgents);
		} catch (error) {
			console.error(`Failed to update service status for agent ${agentId}:`, error);
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
														<motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
															<Link href={`/terminal/${agent.id}`}>
																<Button variant="outline" size="icon" title="Open Terminal">
																	<Terminal className="h-4 w-4" />
																</Button>
															</Link>
														</motion.div>
														<motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
															<Button
																variant="outline"
																size="icon"
																onClick={() => handleService(agent.id, agent.status)}
															>
																{agent.status === "ACTIVE" ? (
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
