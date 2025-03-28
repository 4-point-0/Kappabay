"use client";

import { useQuery } from "@tanstack/react-query";
import { Cog } from "lucide-react";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api";
import type { UUID } from "@elizaos/core";
import { formatAgentName } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
	const query = useQuery({
		queryKey: ["agents"],
		queryFn: () => apiClient.getAgents(),
		refetchInterval: 60_000,
	});

	const agents = query?.data?.agents;

	if (agents && agents.length > 0) {
		redirect(`/chat/${agents[0].id}`);
	}

	return (
		<div className="flex flex-col gap-4 h-full p-4">
			<PageTitle title="Agents" />
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				{agents?.map((agent: { id: UUID; name: string }) => (
					<Card key={agent.id}>
						<CardHeader>
							<CardTitle>{agent?.name}</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="rounded-md bg-muted aspect-square w-full grid place-items-center">
								<div className="text-6xl font-bold uppercase">{formatAgentName(agent?.name)}</div>
							</div>
						</CardContent>
						<CardFooter>
							<div className="flex items-center gap-4 w-full">
								<Link href={`/chat/${agent.id}`} className="w-full grow">
									<Button variant="outline" className="w-full grow">
										Chat
									</Button>
								</Link>
								<Link href={`/settings/${agent.id}`} key={agent.id}>
									<Button size="icon" variant="outline">
										<Cog />
									</Button>
								</Link>
							</div>
						</CardFooter>
					</Card>
				))}
			</div>
		</div>
	);
}
