"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startAgent, stopAgent } from "@/lib/actions/agent-actions";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner"; // import spinner component

export default function AgentActions({ agentId }: { agentId: string }) {
	const [isStartLoading, setIsStartLoading] = useState(false);
	const [isStopLoading, setIsStopLoading] = useState(false);
	const router = useRouter();

	return (
		<>
			<LoadingButton
				variant="outline"
				size="sm"
				loading={isStartLoading}
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
			</LoadingButton>
			<LoadingButton
				variant="destructive"
				size="sm"
				loading={isStopLoading}
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
			</LoadingButton>
		</>
	);
}
