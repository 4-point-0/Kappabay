"use client";

import { useCurrentAccount } from "@mysten/dapp-kit"; // adjust import if needed
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AgentActions from "@/components/agent-actions";

type Agent = {
	id: string;
	name: string;
	objectId: string;
	status: string;
	dockerServiceId: string;
	latestBlobHash?: string;
};

export default function Status() {
	const wallet = useCurrentAccount();
	let agents: Agent[] = [];
	// if (wallet?.address) {
	// 	agents = await getAgentsByOwner(wallet.address);
	// }

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
					{[].map((agent: any) => (
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
