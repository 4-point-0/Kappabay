"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startAgent, stopAgent } from "@/lib/actions/agent-actions";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function AgentActions({ agentId }: { agentId: string }) {
	const [isStartLoading, setIsStartLoading] = useState(false);
	const [isStopLoading, setIsStopLoading] = useState(false);
	const router = useRouter();

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				loading={isStartLoading}
				disabled={isStartLoading || isStopLoading}
				onClick={async () => {
					setIsStartLoading(true);
					try {
						await startAgent(agentId);
						toast({ title: "Started", description: "Agent started successfully." });
						router.refresh();
					} catch (error) {
						toast({ title: "Error", description: "Could not start agent.", variant: "destructive" });
					} finally {
						setIsStartLoading(false);
					}
				}}
			>
				Start
			</Button>
			<Button
				variant="destructive"
				size="sm"
				loading={isStopLoading}
				disabled={isStartLoading || isStopLoading}
				onClick={async () => {
					setIsStopLoading(true);
					try {
						await stopAgent(agentId);
						toast({ title: "Stopped", description: "Agent stopped successfully." });
						router.refresh();
					} catch (error) {
						toast({ title: "Error", description: "Could not stop agent.", variant: "destructive" });
					} finally {
						setIsStopLoading(false);
					}
				}}
			>
				Stop
			</Button>
		</>
	);
}
