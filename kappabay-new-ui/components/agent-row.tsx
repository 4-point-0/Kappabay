"use client";

import { TableCell, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Terminal, Loader2, Pause, Play, RefreshCw, Settings, Send, Wallet } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AddressShort } from "./address-short";

interface AgentRowProps {
	agent: any;
	index: number;
	loadingAgent: string | null;
	terminalEnabledAgents: string[];
	onServiceToggle: (agentId: string, currentStatus: string) => Promise<void>;
	onOpenManageGas: (agent: any) => void;
	onOpenTransferCap: (agent: any) => void;
}

function generateLastActive(createdAt: any) {
	// Convert createdAt to a Date object if it isn't already
	const createdDate = new Date(createdAt);

	// Generate a random number of days between 1 and 10
	const randomDays = Math.floor(Math.random() * 10) + 1;

	// Calculate the last active date by subtracting the random days
	const lastActiveDate = new Date(createdDate);
	lastActiveDate.setDate(createdDate.getDate() - randomDays);

	return lastActiveDate
		.toLocaleDateString("en-GB", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		})
		.replace(/\//g, "-");
}

export default function AgentRow({
	agent,
	index,
	loadingAgent,
	terminalEnabledAgents,
	onServiceToggle,
	onOpenManageGas,
	onOpenTransferCap,
}: AgentRowProps) {
	const isActive = agent.status === "ACTIVE";
	return (
		<motion.tr
			key={agent.id}
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: index * 0.1 }}
			className="border-b border-border"
		>
			<TableCell className="font-medium">{agent.name}</TableCell>
			<TableCell className="font-mono text-xs">
				<AddressShort address={agent.id} />
			</TableCell>
			<TableCell>
				<Badge variant={isActive ? "default" : "outline"}>{isActive ? "Active" : "Inactive"}</Badge>
			</TableCell>

			<TableCell>
				<div className="flex items-center">
					<span className="mr-2">{agent.gasBag} SUI</span>
					{/* Trigger ManageGasDialog from parent */}
					<Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onOpenManageGas(agent)}>
						<Wallet className="h-3 w-3" />
					</Button>
				</div>
			</TableCell>
			{/* <TableCell>
				{agent.timeRemaining?.includes("hours") ? (
					Number.parseInt(agent.timeRemaining) < 4 ? (
						<div className="flex items-center text-red-500">
							<span>{agent.timeRemaining}</span>
							<div className="relative ml-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="text-red-500"
								>
									<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
									<line x1="12" y1="9" x2="12" y2="13"></line>
									<line x1="12" y1="17" x2="12.01" y2="17"></line>
								</svg>
								<div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
									Critical: Less than 4 hours uptime remaining
								</div>
							</div>
						</div>
					) : (
						<div className="flex items-center text-yellow-500 group">
							<span>{agent.timeRemaining}</span>
							<div className="relative ml-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="text-yellow-500"
								>
									<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
									<line x1="12" y1="9" x2="12" y2="13"></line>
									<line x1="12" y1="17" x2="12.01" y2="17"></line>
								</svg>
								<div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
									Less than a day remaining
								</div>
							</div>
						</div>
					)
				) : (
					<span>{agent.timeRemaining}</span>
				)}
			</TableCell> */}
			<TableCell>
				{new Date(agent.createdAt)
					.toLocaleDateString("en-GB", {
						day: "2-digit",
						month: "2-digit",
						year: "numeric",
					})
					.replace(/\//g, "-")}
			</TableCell>
			<TableCell>{isActive ? "now" : agent.lastActive ?? generateLastActive(agent.createdAt)} </TableCell>
			<TableCell className="text-right">
				<div className="flex justify-end space-x-2">
					<motion.div
						whileHover={{
							scale: isActive && terminalEnabledAgents.includes(agent.id) ? 1.1 : 1,
						}}
						whileTap={{
							scale: isActive && terminalEnabledAgents.includes(agent.id) ? 0.9 : 1,
						}}
					>
						{isActive ? (
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
						<Button variant="outline" size="icon" title="Transfer Agent Cap" onClick={() => onOpenTransferCap(agent)}>
							<Send className="h-4 w-4" />
						</Button>
					</motion.div>
					<Button variant="outline" size="icon" onClick={() => onServiceToggle(agent.id, agent.status)}>
						{loadingAgent === agent.id ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : isActive ? (
							<Pause className="h-4 w-4" />
						) : (
							<Play className="h-4 w-4" />
						)}
					</Button>
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
	);
}
