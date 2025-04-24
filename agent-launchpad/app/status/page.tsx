"use client";

import { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit"; // adjust import if needed
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import AgentActions from "@/components/agent-actions";

type Agent = {
	id: string;
	name: string;
	objectId: string;
	status: string;
	dockerServiceId: string;
	latestBlobHash?: string;
};

export default function AgentsPage() {
	const wallet = useCurrentAccount();
	const [agents, setAgents] = useState<Agent[]>([]);

	useEffect(() => {
		async function fetchAgents() {
			if (!wallet?.address) return;
			const res = await fetch(`/api/my-agents?ownerWallet=${encodeURIComponent(wallet.address)}`);
			if (res.ok) {
				setAgents(await res.json());
			} else {
				toast({ title: "Error", description: "Failed to load agents", variant: "destructive" });
			}
		}
		fetchAgents();
	}, [wallet]);

	return (
		<div className="container mx-auto p-4">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Agent</TableHead>
						<TableHead>Object ID</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Agent ID</TableHead>
						<TableHead>Latest Blob Hash</TableHead>
						<TableHead>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{agents.map((agent) => (
						<TableRow key={agent.id}>
							<TableCell>{agent.name}</TableCell>
							<TableCell>{agent.objectId}</TableCell>
							<TableCell>{agent.status}</TableCell>
							<TableCell>{agent.id}</TableCell>
							<TableCell>{agent.latestBlobHash || "N/A"}</TableCell>
							<TableCell>
								<AgentActions agentId={agent.id} />
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
