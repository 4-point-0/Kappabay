"use client";

import Header from "@/components/header";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/page-transition";
import { motion } from "framer-motion";
import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Info, Plus, Star } from "lucide-react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSignExecuteAndWaitForTransaction } from "@/hooks/use-sign";
import { listAgent } from "@/lib/marketplace-utils";

// Mock data for marketplace agents
const marketplaceAgents = [
	{
		id: "1",
		name: "Financial Advisor",
		description: "AI agent specialized in financial analysis and investment advice",
		price: "0.5 SUI",
		creator: "0x123...abc",
		category: "Finance",
		image: "/placeholder.svg?height=200&width=200",
		creationDate: "2023-04-15",
		listingDate: "2023-04-20",
		creatorReputation: 4.8,
	},
	{
		id: "2",
		name: "Crypto Market Analyst",
		description: "Real-time crypto market analysis and trend predictions",
		price: "0.8 SUI",
		creator: "0x456...def",
		category: "Crypto",
		image: "/placeholder.svg?height=200&width=200",
		creationDate: "2023-03-10",
		listingDate: "2023-03-25",
		creatorReputation: 4.2,
	},
	{
		id: "3",
		name: "News Aggregator",
		description: "Collects and summarizes news from various sources",
		price: "0.3 SUI",
		creator: "0x789...ghi",
		category: "News",
		image: "/placeholder.svg?height=200&width=200",
		creationDate: "2023-02-05",
		listingDate: "2023-02-15",
		creatorReputation: 4.5,
	},
	{
		id: "4",
		name: "Social Media Manager",
		description: "Manages social media accounts and generates content",
		price: "0.6 SUI",
		creator: "0xabc...123",
		category: "Social",
		image: "/placeholder.svg?height=200&width=200",
		creationDate: "2023-01-20",
		listingDate: "2023-02-01",
		creatorReputation: 4.0,
	},
];

// Mock data for user's owned agents
const ownedAgents = [
	{
		id: "owned-1",
		name: "Personal Assistant",
		description: "Helps with scheduling and daily tasks",
		category: "Productivity",
	},
	{
		id: "owned-2",
		name: "Code Reviewer",
		description: "Reviews code and suggests improvements",
		category: "Development",
	},
	{
		id: "owned-3",
		name: "Data Analyzer",
		description: "Analyzes data and generates insights",
		category: "Analytics",
	},
];

// All available categories
const allCategories = ["All", "Finance", "Crypto", "News", "Social", "Productivity", "Development", "Analytics"];

export default function MarketplacePage() {
	const [selectedCategory, setSelectedCategory] = useState("All");
	const [selectedAgent, setSelectedAgent] = useState<any>(null);
	const [newListingAgent, setNewListingAgent] = useState("");
	const [newListingPrice, setNewListingPrice] = useState("");
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);
	const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
	const [newListingCategory, setNewListingCategory] = useState("");

	// ── on‐chain helpers ───────────────────────────────────────────────────
	const wallet = useCurrentAccount();
	const signAndExecuteTransaction = useSignExecuteAndWaitForTransaction();

	// Filter agents based on selected category
	const filteredAgents =
		selectedCategory === "All"
			? marketplaceAgents
			: marketplaceAgents.filter((agent) => agent.category === selectedCategory);

	const handlePurchase = (agent: any) => {
		alert(`Purchasing agent: ${agent.name} for ${agent.price}`);
	};

	const handleCreateListing = async () => {
		if (!wallet?.address || !newListingAgent || !newListingPrice || !newListingCategory) {
			alert("Please connect your wallet and fill out all fields");
			return;
		}

		try {
			// convert SUI → mist
			const priceMist = BigInt(Math.round(Number(newListingPrice) * 1e9)).toString();

			// You must supply real IDs here:
			//   - MARKETPLACE_ID: the on-chain marketplace object
			//   - agentCapId: the capability object ID for your agent
			//   - agentId: the agent object ID
			//   - kioskId, kioskCapId: your user kiosk + its capability
			// For now we assume newListingAgent holds both agentCapId & agentId,
			// and that you have fetched your kiosk IDs into variables:
			const MARKETPLACE_ID = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID!;
			const agentCapId = newListingAgent;
			const agentId = newListingAgent;
			const kioskId = YOUR_KIOSK_ID;
			const kioskCapId = YOUR_KIOSK_CAP_ID;

			const tx = listAgent(
				MARKETPLACE_ID,
				agentCapId,
				agentId,
				kioskId,
				kioskCapId,
				priceMist,
				/* optional: name */ "",
				/* optional: description */ "",
				/* optional: imageUrl */ ""
			);

			await signAndExecuteTransaction(tx);
			alert("Listing created on-chain!");

			// reset form
			setNewListingAgent("");
			setNewListingPrice("");
			setNewListingCategory("");
			setIsCreateListingOpen(false);
		} catch (err) {
			console.error("Listing failed", err);
			alert("Failed to create listing. See console for details.");
		}
	};

	const openDetails = (agent: any) => {
		setSelectedAgent(agent);
		setIsDetailsOpen(true);
	};

	return (
		<main className="min-h-screen bg-background text-foreground">
			<Header />
			<PageTransition>
				<div className="container mx-auto px-4 py-8">
					{/* Header with filtering */}
					<div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
						<div>
							<h1 className="text-3xl font-bold">Agent Marketplace</h1>
							<p className="text-muted-foreground mt-2">Discover and acquire AI agents for your needs</p>
						</div>

						<div className="flex flex-col sm:flex-row gap-3">
							<div className="flex items-center gap-2">
								<Filter className="h-4 w-4 text-muted-foreground" />
								<Select value={selectedCategory} onValueChange={setSelectedCategory}>
									<SelectTrigger className="w-[180px]">
										<SelectValue placeholder="Filter by category" />
									</SelectTrigger>
									<SelectContent>
										{allCategories.map((category) => (
											<SelectItem key={category} value={category}>
												{category}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<Dialog open={isCreateListingOpen} onOpenChange={setIsCreateListingOpen}>
								<DialogTrigger asChild>
									<Button className="gap-2">
										<Plus className="h-4 w-4" /> Create New Listing
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Create New Listing</DialogTitle>
										<DialogDescription>Select one of your agents to list on the marketplace</DialogDescription>
									</DialogHeader>

									<div className="grid gap-4 py-4">
										<div className="space-y-2">
											<Label htmlFor="agent">Select Agent</Label>
											<Select value={newListingAgent} onValueChange={setNewListingAgent}>
												<SelectTrigger id="agent">
													<SelectValue placeholder="Select an agent" />
												</SelectTrigger>
												<SelectContent>
													{ownedAgents.map((agent) => (
														<SelectItem key={agent.id} value={agent.id}>
															{agent.name} ({agent.category})
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>

										<div className="space-y-2">
											<Label htmlFor="category">Category</Label>
											<Select
												value={newListingCategory}
												onValueChange={setNewListingCategory}
												defaultValue={selectedCategory !== "All" ? selectedCategory : allCategories[1]}
											>
												<SelectTrigger id="category">
													<SelectValue placeholder="Select a category" />
												</SelectTrigger>
												<SelectContent>
													{allCategories.slice(1).map((category) => (
														<SelectItem key={category} value={category}>
															{category}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<p className="text-xs text-muted-foreground">
												Select the category that best describes this agent
											</p>
										</div>

										<div className="space-y-2">
											<Label htmlFor="price">Price (SUI)</Label>
											<Input
												id="price"
												type="number"
												step="0.1"
												min="0.1"
												placeholder="0.5"
												value={newListingPrice}
												onChange={(e) => setNewListingPrice(e.target.value)}
											/>
										</div>
									</div>

									<DialogFooter>
										<Button variant="outline" onClick={() => setIsCreateListingOpen(false)}>
											Cancel
										</Button>
										<Button onClick={handleCreateListing}>Create Listing</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
						</div>
					</div>

					{/* Agent listings */}
					<motion.div
						className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.5 }}
					>
						{filteredAgents.map((agent, index) => (
							<motion.div
								key={agent.id}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.3, delay: index * 0.1 }}
								whileHover={{ y: -5, transition: { duration: 0.2 } }}
							>
								<Card className="overflow-hidden h-full flex flex-col">
									<div className="h-48 bg-muted flex items-center justify-center">
										<img
											src={agent.image || "/placeholder.svg"}
											alt={agent.name}
											className="w-full h-full object-cover"
										/>
									</div>
									<CardContent className="p-4 flex-grow">
										<div className="flex justify-between items-start mb-2">
											<h3 className="font-bold text-lg">{agent.name}</h3>
											<Badge variant="outline">{agent.category}</Badge>
										</div>
										<p className="text-sm text-muted-foreground mb-4">{agent.description}</p>
										<div className="text-sm text-muted-foreground">
											<p>Creator: {agent.creator}</p>
											<p className="font-medium text-foreground mt-2">{agent.price}</p>
										</div>
									</CardContent>
									<CardFooter className="p-4 pt-0 flex justify-between">
										<Button variant="outline" size="sm" className="gap-1" onClick={() => openDetails(agent)}>
											<Info className="h-4 w-4" /> Details
										</Button>
										<Button size="sm" onClick={() => handlePurchase(agent)}>
											Purchase
										</Button>
									</CardFooter>
								</Card>
							</motion.div>
						))}
					</motion.div>

					{/* Details Modal */}
					<Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
						<DialogContent className="sm:max-w-md">
							<DialogHeader>
								<DialogTitle>{selectedAgent?.name}</DialogTitle>
								<DialogDescription>{selectedAgent?.description}</DialogDescription>
							</DialogHeader>

							{selectedAgent && (
								<div className="grid gap-4 py-4">
									<div className="flex items-center gap-4">
										<img
											src={selectedAgent.image || "/placeholder.svg"}
											alt={selectedAgent.name}
											className="w-20 h-20 object-cover rounded-md"
										/>
										<div>
											<Badge variant="outline">{selectedAgent.category}</Badge>
											<p className="font-medium text-lg mt-1">{selectedAgent.price}</p>
										</div>
									</div>

									<div className="space-y-2">
										<div className="flex justify-between text-sm">
											<span className="text-muted-foreground">Creator:</span>
											<span>{selectedAgent.creator}</span>
										</div>
										<div className="flex justify-between text-sm">
											<span className="text-muted-foreground">Creation Date:</span>
											<span>{selectedAgent.creationDate}</span>
										</div>
										<div className="flex justify-between text-sm">
											<span className="text-muted-foreground">Listing Date:</span>
											<span>{selectedAgent.listingDate}</span>
										</div>
										<div className="flex justify-between text-sm items-center">
											<span className="text-muted-foreground">Creator Reputation:</span>
											<span className="flex items-center">
												{selectedAgent.creatorReputation}
												<Star className="h-3 w-3 text-yellow-500 ml-1 fill-yellow-500" />
											</span>
										</div>
									</div>
								</div>
							)}

							<DialogFooter className="sm:justify-between">
								<Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
									Close
								</Button>
								<Button onClick={() => handlePurchase(selectedAgent)}>Purchase for {selectedAgent?.price}</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>
			</PageTransition>
		</main>
	);
}
