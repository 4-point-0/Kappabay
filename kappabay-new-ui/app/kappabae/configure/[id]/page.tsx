"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/header";
import { PageTransition } from "@/components/page-transition";
import { motion } from "framer-motion";
import CharacterQuestionnaire from "@/components/character-questionnaire";
import AgentDeployer from "@/components/agent-deployer";
import { CompanionSummary } from "@/components/companion-summary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

// Try to read the raw questionnaire from sessionStorage
const loadSavedConfig = (): any | null => {
	try {
		const raw = sessionStorage.getItem("waifuConfig");
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
};

export default function ConfigurePage() {
	const params = useParams();
	const id = params.id as string;
	const [loading, setLoading] = useState(true);
	const [waifuConfig, setWaifuConfig] = useState<any>(null);
	const [started, setStarted] = useState(false);
	const [showDeployer, setShowDeployer] = useState(false);

	useEffect(() => {
		const loadConfig = async () => {
			// 1) first check sessionStorage (piped in by the create page)
			const saved = loadSavedConfig();
			if (saved) {
				setWaifuConfig(saved);
				setLoading(false);
				return;
			}
			// 2) fallback: load from your real endpoint (if you have one)
			try {
				const res = await fetch(`/api/agents/${id}`);
				if (!res.ok) throw new Error(res.statusText);
				const data = await res.json();
				setWaifuConfig(data.config);
			} catch (err) {
				console.error("Fetch agent config failed:", err);
			} finally {
				setLoading(false);
			}
		};

		loadConfig();
	}, [id]);

	// when the user finishes the questionnaire, show the Update UI
	const handleComplete = (config: any) => {
		setWaifuConfig(config);
		setStarted(true);
		setShowDeployer(false);
	};

	return (
		<main className="min-h-screen bg-background text-foreground">
			<Header />
			<PageTransition>
				<div className="container mx-auto px-4 py-8">
					<div className="flex items-center mb-8">
						<Link href="/kappabae/status">
							<Button variant="ghost" size="icon" className="mr-2">
								<ArrowLeft className="h-4 w-4" />
							</Button>
						</Link>
						<div>
							<h1 className="text-3xl font-bold">Configure Companion</h1>
							<p className="text-muted-foreground">
								Waifu ID: <span className="font-mono">{id}</span>
							</p>
						</div>
					</div>

					{loading ? (
						<div className="flex justify-center items-center h-64">
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
								className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
							/>
						</div>
					) : waifuConfig && !started ? (
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
							<CharacterQuestionnaire initialConfig={waifuConfig} onComplete={handleComplete} />
						</motion.div>
					) : waifuConfig && started && !showDeployer ? (
						<CompanionSummary
							config={waifuConfig}
							isConfiguring
							agentId={id}
							onBack={() => setStarted(false)}
						/>
					) : (
						<div className="flex justify-center items-center h-64">
							<p>Failed to load companion configuration. Please try again.</p>
						</div>
					)}
				</div>
			</PageTransition>
		</main>
	);
}
