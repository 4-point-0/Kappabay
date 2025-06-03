"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { ArrowUp, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";
import AgentRow from "./agent-row";
import type { Agent } from "@prisma/client";

interface AgentsTableProps {
	agents: Agent[];
	loadingAgent: string | null;
	terminalEnabledAgents: string[];
	moneyLabel?: string;
	onServiceToggle: (agentId: string, currentStatus: string) => Promise<void>;
	onOpenManageGas: (agent: any) => void;
	onOpenTransferCap: (agent: any) => void;
}

export default function AgentsTable({
	agents,
	loadingAgent,
	terminalEnabledAgents,
	moneyLabel,
	onServiceToggle,
	onOpenManageGas,
	onOpenTransferCap,
}: AgentsTableProps) {
	// 1) sort state
	const [sortField, setSortField] = useState<keyof Agent | null>(null);
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

	// 2) sorted list
	const sortedAgents = useMemo(() => {
		if (!sortField) return agents;
		return [...agents].sort((a, b) => {
			const aVal = a[sortField];
			const bVal = b[sortField];
			// date compare
			if (
				aVal instanceof Date ||
				bVal instanceof Date ||
				(typeof aVal === "string" && Date.parse(aVal).toString() !== "NaN")
			) {
				const ta = new Date(aVal as any).getTime();
				const tb = new Date(bVal as any).getTime();
				return sortDirection === "asc" ? ta - tb : tb - ta;
			}
			// numeric compare
			if (typeof aVal === "number" && typeof bVal === "number") {
				return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
			}
			// fallback to string
			return sortDirection === "asc"
				? String(aVal).localeCompare(String(bVal))
				: String(bVal).localeCompare(String(aVal));
		});
	}, [agents, sortField, sortDirection]);

	// 3) header click toggler
	const handleSort = (field: keyof Agent) => {
		if (sortField === field) {
			setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortField(field);
			setSortDirection("asc");
		}
	};

	return (
		<Card>
			<CardContent className="p-6">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
								<div className="flex items-center">
									Agent Name
									{sortField === "name" &&
										(sortDirection === "asc" ? (
											<ArrowUp className="ml-1 h-4 w-4" />
										) : (
											<ArrowDown className="ml-1 h-4 w-4" />
										))}
								</div>
							</TableHead>
							<TableHead className="cursor-pointer" onClick={() => handleSort("objectId")}>
								<div className="flex items-center">
									Object ID
									{sortField === "objectId" &&
										(sortDirection === "asc" ? (
											<ArrowUp className="ml-1 h-4 w-4" />
										) : (
											<ArrowDown className="ml-1 h-4 w-4" />
										))}
								</div>
							</TableHead>
							<TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
								<div className="flex items-center">
									Status
									{sortField === "status" &&
										(sortDirection === "asc" ? (
											<ArrowUp className="ml-1 h-4 w-4" />
										) : (
											<ArrowDown className="ml-1 h-4 w-4" />
										))}
								</div>
							</TableHead>
							<TableHead>{moneyLabel || "Gas Bag"}</TableHead>
							<TableHead>Time Remaining</TableHead>
							<TableHead className="cursor-pointer" onClick={() => handleSort("createdAt")}>
								<div className="flex items-center">
									Created
									{sortField === "createdAt" &&
										(sortDirection === "asc" ? (
											<ArrowUp className="ml-1 h-4 w-4" />
										) : (
											<ArrowDown className="ml-1 h-4 w-4" />
										))}
								</div>
							</TableHead>
							<TableHead>Last Active</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sortedAgents.map((agent, index) => (
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
