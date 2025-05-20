"use client";

import Header from "@/components/header";
import { useState } from "react";
import { FilterBar } from "@/components/marketplace/FilterBar";
import { ListingsGrid } from "@/components/marketplace/ListingsGrid";
import { CreateListingDialog } from "@/components/marketplace/CreateListingDialog";
import { AgentDetailsDialog } from "@/components/marketplace/AgentDetailsDialog";


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
			<CreateListingDialog open={open} setOpen={setOpen} allCategories={allCategories} />
			<AgentDetailsDialog
				agent={detailsAgent}
				open={detailsOpen}
				onOpenChange={setDetailsOpen}
				onPurchase={handlePurchase}
			/>
		</main>
	);
}
