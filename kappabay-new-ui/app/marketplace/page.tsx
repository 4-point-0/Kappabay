"use client";

import Header from "@/components/header";
import { useState, useEffect, useCallback, useMemo } from "react";
import { FilterBar } from "@/components/marketplace/FilterBar";
import { ListingsGrid } from "@/components/marketplace/ListingsGrid";
import { CreateListingDialog } from "@/components/marketplace/CreateListingDialog";
import { AgentDetailsDialog } from "@/components/marketplace/AgentDetailsDialog";
import { readDynamicFields } from "@/lib/marketplace-utils";


// All available categories
const allCategories = ["All", "Finance", "Crypto", "News", "Social", "Productivity", "Development", "Analytics"];

export default function MarketplacePage() {
	const [category, setCategory] = useState("All");
	const [detailsAgent, setDetailsAgent] = useState<any>(null);
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [open, setOpen] = useState(false);

	// live listings from on‐chain marketplace
	const [listings, setListings] = useState<any[]>([]);

	const fetchListings = useCallback(async () => {
		try {
			const data = await readDynamicFields();
			setListings(data);
		} catch (err) {
			console.error("Failed to load marketplace listings:", err);
		}
	}, []);

	// initial load + poll every 10s (cleanup on unmount)
	useEffect(() => {
		fetchListings();
		const id = setInterval(fetchListings, 10_000);
		return () => clearInterval(id);
	}, [fetchListings]);

	// apply category filter to live data (default missing categories to "All")
	const filtered = useMemo(() => {
		return category === "All"
			? listings
			: listings.filter(
					(l) => (l.fields.category ?? "All") === category
			  );
	}, [listings, category]);

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
			<section className="mx-4 my-8">
				<FilterBar
					categories={allCategories}
					selected={category}
					onSelect={setCategory}
					onCreateClick={() => {
						setOpen(true);
					}}
				/>
				<ListingsGrid agents={filtered} onDetails={openDetails} onPurchase={handlePurchase} />
				<CreateListingDialog
					open={open}
					setOpen={setOpen}
					allCategories={allCategories}
					onCreate={() => {
						fetchListings();
					}}
				/>
				<AgentDetailsDialog
					agent={detailsAgent}
					open={detailsOpen}
					onOpenChange={setDetailsOpen}
					onPurchase={handlePurchase}
				/>
			</section>
		</main>
	);
}
