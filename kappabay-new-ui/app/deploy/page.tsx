"use client";

import AgentDeployer from "@/components/agent-deployer";
import Header from "@/components/header";
import { PageTransition } from "@/components/page-transition";
import { motion } from "framer-motion";
import Image from "next/image";

export default function DeployPage() {
	return (
		<main className="min-h-screen bg-background text-foreground">
			<Header />
			<PageTransition>
				<div className="container mx-auto px-4 py-8 ">
					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
						<h1 className="text-3xl font-bold mb-6">Agent Launchpad Deployer</h1>
						<p className="text-muted-foreground mb-8">
							Configure and deploy your AI agent with customizable parameters.
						</p>
						<AgentDeployer />
						{/* Mountain landscape - positioned with lower z-index */}
					</motion.div>
				</div>
			</PageTransition>
		</main>
	);
}
