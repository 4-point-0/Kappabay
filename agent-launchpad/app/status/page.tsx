"use client";

import { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit"; // adjust import if needed
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

type Agent = {
	id: string;
	name: string;
	objectId: string;
	status: string;
	dockerServiceId: string;
	// ... include other fields as needed (gasBag, createdAt, lastActive, dockerServiceId, etc.)
};

export default function AgentsPage() {
	const wallet = useCurrentAccount();
	const [agents, setAgents] = useState<Agent[]>([]);

	useEffect(() => {
		async function fetchAgents() {
			if (!wallet?.address) return;
			const res = await fetch(`/api/agents?ownerWallet=${encodeURIComponent(wallet.address)}`);
			if (res.ok) {
				setAgents(await res.json());
			} else {
				toast({ title: "Error", description: "Failed to load agents", variant: "destructive" });
			}
		}
		fetchAgents();
	}, [wallet]);

	async function handleStart(serviceId: string) {
		const res = await fetch("/api/agent/start", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ serviceId }),
		});
		if (res.ok) {
			toast({ title: "Started", description: "Agent started successfully." });
		} else {
			toast({ title: "Error", description: "Could not start agent.", variant: "destructive" });
		}
	}

	async function handleStop(serviceId: string) {
		const res = await fetch("/api/agent/stop", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ serviceId }),
		});
		if (res.ok) {
			toast({ title: "Stopped", description: "Agent stopped successfully." });
		} else {
			toast({ title: "Error", description: "Could not stop agent.", variant: "destructive" });
		}
	}

	return (
		<div className="container mx-auto p-4">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Agent</TableHead>
						<TableHead>Object ID</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Gas Bag</TableHead>
						<TableHead>Created</TableHead>
						<TableHead>Last Active</TableHead>
						<TableHead>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{agents.map((agent) => (
						<TableRow key={agent.id}>
							<TableCell>{agent.name}</TableCell>
							<TableCell>{agent.objectId}</TableCell>
							<TableCell>{agent.status}</TableCell>
							<TableCell>{/* Display gas bag info if available */}</TableCell>
							<TableCell>{/* Format createdAt */}</TableCell>
							<TableCell>{/* Format lastActive */}</TableCell>
							<TableCell>
								<Button variant="outline" size="sm" onClick={() => handleStart(agent.dockerServiceId!)}>
									Start
								</Button>
								<Button variant="destructive" size="sm" onClick={() => handleStop(agent.dockerServiceId!)}>
									Stop
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
