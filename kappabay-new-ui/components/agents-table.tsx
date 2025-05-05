"use client";

import { Card, CardContent } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { motion } from "framer-motion";
import AgentRow from "./agent-row";

interface AgentsTableProps {
	agents: any[]; // ideally replace "any" with a proper Agent type
	loadingAgent: string | null;
	terminalEnabledAgents: string[];
	onServiceToggle: (agentId: string, currentStatus: string) => Promise<void>;
	onOpenManageGas: (agent: any) => void;
	onOpenTransferCap: (agent: any) => void;
}

export default function AgentsTable({
	agents,
	loadingAgent,
	terminalEnabledAgents,
	onServiceToggle,
	onOpenManageGas,
	onOpenTransferCap,
}: AgentsTableProps) {
	return (
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
						{agents.map((agent, index) => (
							<AgentRow
								key={agent.id}
								agent={agent}
								index={index}
								loadingAgent={loadingAgent}
								terminalEnabledAgents={terminalEnabledAgents}
								onServiceToggle={onServiceToggle}
								onOpenManageGas={onOpenManageGas}
								onOpenTransferCap={onOpenTransferCap}
							/>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
