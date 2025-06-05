"use client";

import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PageTransition } from "@/components/page-transition";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import BackgroundFooter from "@/components/background-footer";

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

export default function KappabayPage() {
	return (
		<main className="min-h-screen bg-background text-foreground">
			<PageTransition>
				{/* Hero Section */}
				<section className="bg-main-gradient relative h-[120vh]">
					<Header textColor="dark:text-gray-950" />
					<div className="container mx-auto px-4 text-center pt-20">
						<motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
							<motion.h1 variants={itemVariants} className="text-5xl font-bold mb-6 text-background">
								KappaBae
							</motion.h1>
							<motion.p variants={itemVariants} className="text-xl text-background mb-10 max-w-3xl mx-auto">
								Create your perfect digital companion with our AI-powered character builder. Customize personality,
								appearance, and more to bring your ideal waifu to life on the SUI network.
							</motion.p>
							<motion.div variants={itemVariants} className="flex justify-center gap-4">
								<Link href="/kappabae/create">
									<Button size="lg" className="gap-2">
										Create Your Companion <ArrowRight className="h-4 w-4" />
									</Button>
								</Link>
								<Link href="/kappabae/gallery">
									<Button
										variant="outline"
										size="lg"
										className="bg-transparent text-foreground dark:text-gray-950 hover:bg-white/10 rounded-full px-8"
									>
										Browse Gallery
									</Button>
								</Link>
							</motion.div>
						</motion.div>
					</div>
					{/* Decorative elements */}
					<div className="absolute left-1/2 top-[83%] transform -translate-x-1/2 -translate-y-1/2 z-[1]">
						<Image src="/green-moon-group.png" alt="Green Moon" width={500} height={500} priority />
					</div>
					<div className="absolute right-[55%] top-[59%] z-0 rotate-[30deg]">
						<Image src="/ellipse-3.png" alt="Purple Sphere" width={80} height={80} className="opacity-80" />
					</div>

					{/* Purple spheres */}
					<div className="absolute left-[5%] top-[63%] z-0">
						<Image src="/ellipse-1.png" alt="Purple Sphere" width={140} height={140} className="opacity-80" />
					</div>

					<div className="absolute right-[0%] top-[75%] z-0">
						<Image src="/ellipse-3.png" alt="Purple Sphere" width={140} height={140} className="opacity-80" />
					</div>
					<div className="absolute right-[44%] top-[48.3%] z-[2] scale-125">
						<Image src="/kappabae-image.png" alt="Kappabae" width={140} height={140} />
					</div>
				</section>

				{/* Features Section */}
				<section className="py-20">
					<div className="container mx-auto px-4">
						<div className="text-center mb-12">
							<h2 className="text-3xl font-bold mb-4">Why Choose KappaBae?</h2>
							<p className="text-muted-foreground max-w-2xl mx-auto">
								Our digital companions are more than just characters - they're powered by advanced AI and live on the
								blockchain.
							</p>
						</div>

						<div className="grid md:grid-cols-3 gap-8">
							{[
								{
									title: "Personalized Companions",
									description:
										"Create a unique companion tailored to your preferences through our intuitive questionnaire.",
									icon: "💖",
								},
								{
									title: "AI-Powered Interactions",
									description: "Enjoy natural conversations and evolving relationships with advanced language models.",
									icon: "🤖",
								},
								{
									title: "On-Chain Ownership",
									description:
										"Your companion exists as a unique digital asset on the SUI blockchain that you truly own.",
									icon: "🔗",
								},
							].map((feature, index) => (
								<motion.div
									key={index}
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.5, delay: index * 0.1 }}
									viewport={{ once: true }}
									className="rounded-md p-6 text-center"
									style={{
										background: "radial-gradient(113.77% 100% at 50% 100%, #380C41 0%, #030D06 100%)",
									}}
								>
									<div className="text-4xl mb-4">{feature.icon}</div>
									<h3 className="text-xl font-bold mb-2">{feature.title}</h3>
									<p className="text-muted-foreground">{feature.description}</p>
								</motion.div>
							))}
						</div>
					</div>
				</section>

				{/* Testimonials Section */}
				<section className="py-20 bg-muted/30">
					<div className="container mx-auto px-4">
						<div className="text-center mb-12">
							<h2 className="text-3xl font-bold mb-4">What Our Users Say</h2>
							<p className="text-muted-foreground max-w-2xl mx-auto">
								Join thousands of satisfied users who have created their perfect digital companions.
							</p>
						</div>

						<div className="grid md:grid-cols-2 gap-8">
							{[
								{
									quote:
										"My KappaBae companion understands me better than anyone. The customization options are incredible!",
									author: "Alex T.",
									avatar: "/placeholder.svg?height=50&width=50",
								},
								{
									quote:
										"I was skeptical at first, but the AI is so responsive and the personality is exactly what I wanted.",
									author: "Jamie K.",
									avatar: "/placeholder.svg?height=50&width=50",
								},
							].map((testimonial, index) => (
								<motion.div
									key={index}
									initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
									whileInView={{ opacity: 1, x: 0 }}
									transition={{ duration: 0.5 }}
									viewport={{ once: true }}
									className="bg-card rounded-md p-6"
								>
									<p className="italic mb-4">"{testimonial.quote}"</p>
									<div className="flex items-center">
										<img
											src={testimonial.avatar || "/placeholder.svg"}
											alt={testimonial.author}
											className="w-10 h-10 rounded-full mr-3"
										/>
										<span className="font-medium">{testimonial.author}</span>
									</div>
								</motion.div>
							))}
						</div>
					</div>
				</section>

				{/* CTA Section */}
				<section className="py-20 relative">
					<div className="container mx-auto px-4 text-center">
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							whileInView={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.5 }}
							viewport={{ once: true }}
							className="bg-primary/10 rounded-xl p-10 max-w-4xl mx-auto"
						>
							<h2 className="text-3xl font-bold mb-4">Ready to Meet Your Perfect Companion?</h2>
							<p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
								Start the character creation process now and bring your ideal companion to life in minutes.
							</p>
							<Link href="/kappabae/create">
								<Button size="lg" className="gap-2">
									Create Your Companion <ArrowRight className="h-4 w-4" />
								</Button>
							</Link>
						</motion.div>
					</div>
					<div className="absolute left-[5%] top-[3%] z-0 scale-75">
						<Image src="/kappabae-chibi-image.png" alt="Chibi" width={140} height={140} className="w-full h-auto" />
					</div>
					<div className="absolute right-[5%] top-[8%] z-0 scale-75">
						<Image src="/kappatux-image.png" alt="Tux" width={140} height={140} className="w-full h-auto" />
					</div>
					<div className="absolute left-1/2 bottom-[-12rem] -translate-x-1/2 text-center z-20">
						<div className="mb-2">
							<Image src="/logo-4pto.png" alt="4pto Labs Logo" width={120} height={40} className="mx-auto" />
						</div>
						<p className="dark:text-white text-background text-sm">By 4pto Labs</p>
					</div>
				</section>
				<BackgroundFooter />
			</PageTransition>
		</main>
	);
}
