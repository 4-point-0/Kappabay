"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CharacterQuestionnaire from "@/components/character-questionnaire";
import { CompanionSummary } from "@/components/companion-summary";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSignExecuteAndWaitForTransaction } from "@/hooks/use-sign";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { deployAgent } from "@/lib/deploy-agent";
import { generateCharacter } from "@/lib/actions/generate-character";

export default function CreateCompanionPage() {
	const [showConfig, setShowConfig] = useState(false);
	const [characterConfig, setCharacterConfig] = useState<any>(null);
	const account = useCurrentAccount();
	const signAndExec = useSignExecuteAndWaitForTransaction();
	const [isDeploying, setIsDeploying] = useState(false);
	const router = useRouter();

	const handleComplete = (config: any) => {
		setCharacterConfig(config);
		setShowConfig(true);
	};

	const handleDeploy = async () => {
		setIsDeploying(true);
		try {
			// 1) generate an AI-tweaked config
			const formData = new FormData();
			formData.append(
				"description",
				`Create Kappbay Waifu (ai girlfriend) with characteristic: ${JSON.stringify(characterConfig)}`
			);
			const { config: aiConfig, error: aiError } = await generateCharacter(formData);
			if (aiError) {
				toast({
					title: "AI Generation Error",
					description: Array.isArray(aiError.description) ? aiError.description.join(", ") : JSON.stringify(aiError),
					variant: "destructive",
				});
				return;
			}

			// 2) deploy using the AI-driven config (fallback to original if none)
			const result = await deployAgent(
				aiConfig || characterConfig,
				signAndExec,
				account?.address || "",
				"kappabay-create"
			);

			// 3) handle deployment outcome
			if (result.success) {
				toast({
					title: "Agent deployed successfully",
					description: `Agent ID: ${result.agentId}`,
				});
				router.push("/kappabay/status");
			} else {
				toast({
					title: "Deployment Error",
					description: result.error || "Unknown error",
					variant: "destructive",
				});
			}
		} catch (err: any) {
			toast({
				title: err.message || "Deployment Error",
				description: "Failed to deploy",
				variant: "destructive",
			});
			console.error(err);
		} finally {
			setIsDeploying(false);
		}
	};

	return (
		<main className="min-h-screen bg-background text-foreground">
			<Header />
			<PageTransition>
				<div className="container mx-auto px-4 py-8">
					<div className="flex items-center mb-8">
						<Link href="/kappabay">
							<Button variant="ghost" size="icon" className="mr-2">
								<ArrowLeft className="h-4 w-4" />
							</Button>
						</Link>
						<h1 className="text-3xl font-bold">Create Your Digital Companion</h1>
					</div>

					<AnimatePresence mode="wait">
						{!showConfig ? (
							<motion.div
								key="questionnaire"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -20 }}
								transition={{ duration: 0.3 }}
							>
								<Card className="p-6">
									<CharacterQuestionnaire onComplete={handleComplete} />
								</Card>
							</motion.div>
						) : (
							<CompanionSummary
								config={characterConfig}
								onBack={() => setShowConfig(false)}
							/>
						)}
					</AnimatePresence>
				</div>
			</PageTransition>
		</main>
	);
}
