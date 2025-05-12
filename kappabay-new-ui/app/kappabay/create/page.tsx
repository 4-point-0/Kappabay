"use client";

import { useState } from "react";
import Header from "@/components/header";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Cog, Sparkles } from "lucide-react";
import CharacterQuestionnaire from "@/components/character-questionnaire";
import { useRouter } from "next/navigation";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSignExecuteAndWaitForTransaction } from "@/hooks/use-sign";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { deployAgent } from "@/lib/deploy-agent";

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
			const result = await deployAgent(characterConfig, signAndExec, account?.address || "", "kappabay-create");
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
							<motion.div
								key="config"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -20 }}
								transition={{ duration: 0.3 }}
								className="space-y-6"
							>
								<Card className="p-6">
									<div className="flex justify-between items-center mb-6">
										<h2 className="text-2xl font-bold">Character Summary</h2>
										<Button variant="outline" onClick={() => setShowConfig(false)}>
											<ArrowLeft className="h-4 w-4 mr-2" /> Back to Questionnaire
										</Button>
									</div>

									<div className="grid md:grid-cols-2 gap-8">
										<div className="bg-muted rounded-lg p-6 flex items-center justify-center">
											<div className="text-center">
												<div className="w-48 h-48 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
													<Sparkles className="h-16 w-16 text-primary/50" />
												</div>
												<p className="text-muted-foreground">Character preview will appear here</p>
											</div>
										</div>

										<div>
											<h3 className="text-xl font-bold mb-4">{characterConfig.name}</h3>
											<div className="space-y-3">
												<div>
													<span className="font-medium">Visual Style:</span>{" "}
													{characterConfig.visualStyle === "anime" ? "Anime / Stylized" : "Realistic / Relatable"}
												</div>
												<div>
													<span className="font-medium">Archetype:</span> {characterConfig.archetype}
												</div>
												<div>
													<span className="font-medium">Personality:</span> {characterConfig.topTraits.join(", ")}
												</div>
												<div>
													<span className="font-medium">Voice:</span> {characterConfig.voiceModel}
												</div>
											</div>

											<div className="mt-6 space-y-3">
												<h4 className="font-medium">Character Description:</h4>
												<div className="bg-muted p-3 rounded-md text-sm">
													<p>Visual style: {characterConfig.visualStyle}</p>
													<p>Archetype: {characterConfig.archetype}</p>
													<p>Personality sliders: {JSON.stringify(characterConfig.sliderValues)}</p>
													<p>Relationship roles: {characterConfig.roles.join(", ")}</p>
													<p>Communication style: {characterConfig.commStyle}</p>
													<p>World setting: {characterConfig.world}</p>
													<p>Origin twist: {characterConfig.origin}</p>
													<p>Lore snippet: {characterConfig.lore || "N/A"}</p>
													<p>
														Appearance: {characterConfig.artStyle}, {characterConfig.hair}, {characterConfig.eyes},{" "}
														{characterConfig.build}, {characterConfig.attire}, {characterConfig.accessory}
													</p>
													<p>Voice model: {characterConfig.voiceModel}</p>
												</div>
											</div>
										</div>
									</div>

									<div className="mt-8 flex justify-between">
										<Button
											variant="outline"
											className="gap-2"
											onClick={() => alert("Advanced configuration coming soon!")}
										>
											<Cog className="h-4 w-4" /> Advanced Configuration
										</Button>
										<Button className="gap-2" onClick={handleDeploy} disabled={isDeploying}>
											{isDeploying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
											Meet Your Waifu <ArrowRight className="h-4 w-4" />
										</Button>
									</div>
								</Card>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</PageTransition>
		</main>
	);
}
