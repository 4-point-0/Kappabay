// -----------------
// Companion Deploy/Update Hook
// -----------------
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSignExecuteAndWaitForTransaction } from "@/hooks/use-sign";
import { toast } from "@/hooks/use-toast";
import { generateCharacter } from "@/lib/actions/generate-character";
import { deployAgent } from "@/lib/deploy-agent";

/**
 * Hook that yields handleDeploy and busy–flag for
 * both Create and Configure flows.
 */
export function useCompanionDeploy(initialConfig: any) {
	const [isBusy, setIsBusy] = useState(false);
	const router = useRouter();
	const account = useCurrentAccount();
	const signAndExec = useSignExecuteAndWaitForTransaction();

	const handleDeploy = useCallback(async () => {
		setIsBusy(true);
		try {
			// create‐agent flow
			const formData = new FormData();
			formData.append("description", JSON.stringify(initialConfig));
			const { config: aiConfig, error } = await generateCharacter(formData);

			if (error) {
				throw new Error(
					Array.isArray(error.description) ? error.description.join(", ") : error.description ?? "AI generation failed"
				);
			}

			const result = await deployAgent(
				aiConfig || initialConfig,
				signAndExec,
				account?.address || "",
				"kappabay-create"
			);

			if (result.success && result.agentId) {
				toast({
					title: "Companion deployed",
					description: `Companion ID: ${result.agentId}`,
				});
				router.push("/kappabae/status");
			} else {
				throw new Error(result.error ?? "Deployment failed");
			}
		} catch (err: any) {
			toast({
				title: "Deployment Error",
				description: err.message,
				variant: "destructive",
			});
		} finally {
			setIsBusy(false);
		}
	}, [initialConfig, account?.address, signAndExec, router]);

	return { handleDeploy, isBusy };
}
