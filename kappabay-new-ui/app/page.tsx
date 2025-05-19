"use client";

import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PageTransition } from "@/components/page-transition";
import { motion } from "framer-motion";

// Animation variants
const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
		},
	},
};

const itemVariants = {
	hidden: { y: 20, opacity: 0 },
	visible: {
		y: 0,
		opacity: 1,
		transition: { duration: 0.5 },
	},
};

export default function Home() {
	return (
		<main className="min-h-screen bg-main-gradient text-foreground">
			<Header />
			<PageTransition>
				{/* Hero Section */}
				<section className="py-20 bg-gradient-to-b from-background to-background/50">
					<div className="container mx-auto px-4 text-center">
						<motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
							<motion.h1 variants={itemVariants} className="text-5xl font-bold mb-6">
								Modular Onchain AI Agents
							</motion.h1>
							<motion.p variants={itemVariants} className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto">
								Kappabay brings intelligent AI agents to life as objects on the SUI network, powered by the Move
								language for secure, modular, and composable agent capabilities.
							</motion.p>
							<motion.div variants={itemVariants} className="flex justify-center gap-4">
								<Link href="/deploy">
									<Button size="lg">Deploy Your Agent</Button>
								</Link>
								<Link href="/marketplace">
									<Button variant="outline" size="lg">
										Explore Marketplace
									</Button>
								</Link>
							</motion.div>
						</motion.div>
					</div>
				</section>

				{/* AI Oracle Section */}
				<section className="py-20">
					<div className="container mx-auto px-4">
						<div className="grid md:grid-cols-2 gap-12 items-center">
							<motion.div
								initial={{ x: -50, opacity: 0 }}
								whileInView={{ x: 0, opacity: 1 }}
								transition={{ duration: 0.5 }}
								viewport={{ once: true }}
							>
								<h2 className="text-3xl font-bold mb-6">Integrated AI Oracle</h2>
								<p className="text-lg text-muted-foreground mb-6">
									Our agents feature an integrated AI oracle on SUI that enables users and smart contracts to prompt
									agent objects onchain, receiving prompt objects in return.
								</p>
								<p className="text-lg text-muted-foreground mb-6">
									With Move callback functions, developers can create unique use cases for intelligent decision-making
									directly in smart contracts, enabling branching logic based on AI responses.
								</p>
								<Link href="/deploy">
									<Button>Start Building</Button>
								</Link>
							</motion.div>
							<motion.div
								initial={{ x: 50, opacity: 0 }}
								whileInView={{ x: 0, opacity: 1 }}
								transition={{ duration: 0.5 }}
								viewport={{ once: true }}
								className="bg-muted rounded-lg p-8 h-80 flex items-center justify-center"
							>
								<div className="text-center text-muted-foreground">
									<p className="text-lg font-medium">AI Oracle Diagram</p>
									<p className="text-sm">(Placeholder for diagram/illustration)</p>
								</div>
							</motion.div>
						</div>
					</div>
				</section>
			</PageTransition>
		</main>
	);
}
