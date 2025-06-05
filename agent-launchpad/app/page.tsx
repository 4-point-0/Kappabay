"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PageTransition } from "@/components/page-transition";
import { motion } from "framer-motion";
import Image from "next/image";
import Header from "@/components/header";

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
		<main className="min-h-screen text-foreground relative overflow-hidden">
			<PageTransition>
				{/* Hero Section */}
				<section className="bg-main-gradient relative h-[100vh]">
					<Header textColor="dark:text-gray-950" />
					<div className="container mx-auto px-4 text-center pt-20 pb-40 relative z-10">
						<motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
							<motion.h1
								variants={itemVariants}
								className="text-5xl md:text-6xl font-bold mb-6 dark:gray-950 text-background"
							>
								Modular Onchain AI Agents
							</motion.h1>
							<motion.p
								variants={itemVariants}
								className="text-xl dark:gray-950 text-background mb-10 max-w-3xl mx-auto"
							>
								Kappabay brings intelligent AI agents to life as objects on the SUI network, powered by the Move
								language for secure, modular, and composable agent capabilities.
							</motion.p>
							<motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-4">
								<Link href="/deploy">
									<Button
										size="lg"
										className="bg-success-600 hover:bg-success-600/90 font-medium rounded-full px-8 text-black"
									>
										Deploy Your Agent
									</Button>
								</Link>
								<Link href="/marketplace">
									<Button
										variant="outline"
										size="lg"
										className="bg-transparent text-foreground dark:text-gray-950 hover:bg-white/10 rounded-full px-8"
									>
										Explore Marketplace
									</Button>
								</Link>
							</motion.div>
						</motion.div>
					</div>

					{/* Decorative elements */}
					<div className="absolute left-1/2 top-[83%] transform -translate-x-1/2 -translate-y-1/2 z-[1]">
						<Image src="/green-moon-group.png" alt="Green Moon" width={500} height={500} priority />
					</div>
					<div className="absolute right-[55%] top-[54%] z-0 rotate-[30deg]">
						<Image src="/ellipse-3.png" alt="Purple Sphere" width={80} height={80} className="opacity-80" />
					</div>

					{/* Purple spheres */}
					<div className="absolute left-[5%] top-[63%] z-0">
						<Image src="/ellipse-1.png" alt="Purple Sphere" width={140} height={140} className="opacity-80" />
					</div>

					<div className="absolute right-[0%] top-[75%] z-0">
						<Image src="/ellipse-3.png" alt="Purple Sphere" width={140} height={140} className="opacity-80" />
					</div>
				</section>

				{/* AI Oracle Section */}
				<section className="py-20 bg-gradient-start relative min-h-[130vh]">
					{/* Grid background */}
					<div
						className="absolute inset-0 bg-[linear-gradient(rgba(2,8,23,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(2,8,23,0.2)_1px,transparent_1px)]"
						style={{ backgroundSize: "40px 40px" }}
					></div>

					{/* Mountain landscape - positioned with lower z-index */}
					<div className="absolute bottom-0 left-0 right-0 z-0">
						<Image
							src="/main-background.png"
							alt="Mountain Landscape"
							width={1920}
							height={600}
							className="w-full h-auto"
							priority
						/>
					</div>

					{/* Content that overlaps the mountains - higher z-index */}
					<div className="container mx-auto px-4 relative z-10">
						<div className="grid md:grid-cols-2 gap-16 items-start mx-28">
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5 }}
								viewport={{ once: true }}
							>
								<h2 className="text-4xl font-bold mb-6 dark:text-white text-background">Integrated AI Oracle</h2>
								<p className="text-lg dark:text-white text-background mb-6">
									Our agents feature an integrated AI oracle on SUI that enables users and smart contracts to prompt
									agent objects onchain, receiving prompt objects in return.
								</p>
								<p className="text-lg dark:text-white text-background mb-8">
									With Move callback functions, developers can create unique use cases for intelligent decision-making
									directly in smart contracts, enabling branching logic based on AI responses.
								</p>
								<Link href="/deploy">
									<Button className="bg-success-600 hover:bg-success-600/90 text-black font-medium rounded-full px-8">
										Start Building
									</Button>
								</Link>
							</motion.div>
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5, delay: 0.2 }}
								viewport={{ once: true }}
								className="rounded-lg h-[300px] flex items-center justify-center"
							>
								<div className="text-center text-gray-600 ">
									<Image
										src="/decision.jpg"
										alt="Decision"
										width={120}
										height={40}
										className="w-full h-auto rounded-md"
									/>
								</div>
							</motion.div>
						</div>
					</div>

					{/* 4pto Labs logo and text - highest z-index */}
					<div className="absolute left-1/2 bottom-[18rem] -translate-x-1/2 text-center z-20">
						<div className="mb-2">
							<Image src="/logo-4pto.png" alt="4pto Labs Logo" width={120} height={40} className="mx-auto" />
						</div>
						<p className="dark:text-white text-background text-sm">By 4pto Labs</p>
					</div>
				</section>
			</PageTransition>
		</main>
	);
}
