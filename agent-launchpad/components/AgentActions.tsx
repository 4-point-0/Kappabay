"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { startAgent, stopAgent } from "@/actions/agent-actions";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function AgentActions({ agentId }: { agentId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          startTransition(async () => {
            try {
              await startAgent(agentId);
              toast({ title: "Started", description: "Agent started successfully." });
              router.refresh();
            } catch (error) {
              toast({ title: "Error", description: "Could not start agent.", variant: "destructive" });
            }
          })
        }
      >
        Start
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() =>
          startTransition(async () => {
            try {
              await stopAgent(agentId);
              toast({ title: "Stopped", description: "Agent stopped successfully." });
              router.refresh();
            } catch (error) {
              toast({ title: "Error", description: "Could not stop agent.", variant: "destructive" });
            }
          })
        }
      >
        Stop
      </Button>
    </>
  );
}
