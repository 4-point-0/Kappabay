"use client";

import Header from "@/components/header";
import { useState } from "react";
import { FilterBar } from "@/components/marketplace/FilterBar";
import { ListingsGrid } from "@/components/marketplace/ListingsGrid";
import { CreateListingDialog } from "@/components/marketplace/CreateListingDialog";
import { AgentDetailsDialog } from "@/components/marketplace/AgentDetailsDialog";

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

// All available categories
const allCategories = ["All", "Finance", "Crypto", "News", "Social", "Productivity", "Development", "Analytics"];

export default function MarketplacePage() {
	const [category, setCategory] = useState("All");
	const [detailsAgent, setDetailsAgent] = useState<any>(null);
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [open, setOpen] = useState(false);

	const filtered =
		category === "All" ? marketplaceAgents : marketplaceAgents.filter((agent) => agent.category === category);

	const openDetails = (a: any) => {
		setDetailsAgent(a);
		setDetailsOpen(true);
	};
	const handlePurchase = (a: any) => {
		alert(`Purchasing agent: ${a.name} for ${a.price}`);
	};

	return (
		<main className="min-h-screen bg-background text-foreground">
			<Header />
			<FilterBar
				categories={allCategories}
				selected={category}
				onSelect={setCategory}
				onCreateClick={() => {
					setOpen(true);
				}}
			/>
			<ListingsGrid agents={filtered} onDetails={openDetails} onPurchase={handlePurchase} />
			<CreateListingDialog open={open} setOpen={setOpen} />
			<AgentDetailsDialog
				agent={detailsAgent}
				open={detailsOpen}
				onOpenChange={setDetailsOpen}
				onPurchase={handlePurchase}
			/>
		</main>
	);
}
