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

export default function CreateCompanionPage() {
	const [showConfig, setShowConfig] = useState(false);
	const [characterConfig, setCharacterConfig] = useState<any>(null);

	const handleComplete = (config: any) => {
		setCharacterConfig(config);
		setShowConfig(true);
	};

	return (
		<main className="min-h-screen bg-background text-foreground">
			<Header />
			<PageTransition>
				<div className="container mx-auto px-4 py-8">
					<div className="flex items-center mb-8">
						<Link href="/kappabae">
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
							<CompanionSummary config={characterConfig} onBack={() => setShowConfig(false)} />
						)}
					</AnimatePresence>
				</div>
			</PageTransition>
		</main>
	);
}
