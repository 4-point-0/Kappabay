"use client";

import { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit"; // adjust import if needed
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type Agent = {
	id: string;
	name: string;
	objectId: string;
	status: string;
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
			<header className="flex items-center justify-between mb-8">
				<h1 className="text-3xl font-bold">My Agents</h1>
				<Button
					onClick={() => {
						/* Navigate to deploy new agent page */
					}}
				>
					Deploy New Agent
				</Button>
			</header>
			<table className="w-full border-collapse">
				<thead>
					<tr className="border-b">
						<th className="p-2 text-left">Agent</th>
						<th className="p-2 text-left">Object ID</th>
						<th className="p-2 text-left">Status</th>
						<th className="p-2 text-left">Gas Bag</th>
						<th className="p-2 text-left">Created</th>
						<th className="p-2 text-left">Last Active</th>
						<th className="p-2 text-left">Actions</th>
					</tr>
				</thead>
				<tbody>
					{agents.map((agent) => (
						<tr key={agent.id} className="border-b">
							<td className="p-2">{agent.name}</td>
							<td className="p-2">{agent.objectId}</td>
							<td className="p-2">{agent.status}</td>
							<td className="p-2">{/* Display gas bag info if available */}</td>
							<td className="p-2">{/* Format createdAt */}</td>
							<td className="p-2">{/* Format lastActive */}</td>
							<td className="p-2 space-x-2">
								<Button variant="outline" size="sm" onClick={() => handleStart(agent.dockerServiceId!)}>
									Start
								</Button>
								<Button variant="destructive" size="sm" onClick={() => handleStop(agent.dockerServiceId!)}>
									Stop
								</Button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
