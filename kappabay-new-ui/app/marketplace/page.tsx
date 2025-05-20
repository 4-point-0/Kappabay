"use client";

import Header from "@/components/header";
import { useState, useEffect, useCallback, useMemo } from "react";
import { FilterBar } from "@/components/marketplace/FilterBar";
import { ListingsGrid } from "@/components/marketplace/ListingsGrid";
import { CreateListingDialog } from "@/components/marketplace/CreateListingDialog";
import { AgentDetailsDialog } from "@/components/marketplace/AgentDetailsDialog";
import { readDynamicFields } from "@/lib/marketplace-utils";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSignExecuteAndWaitForTransaction } from "@/hooks/use-sign";
import { useOwnedCaps } from "@/hooks/use-owned-caps";
import { purchaseAgent } from "@/lib/marketplace-utils";
import { toast } from "@/hooks/use-toast";


// All available categories
const allCategories = ["All", "Finance", "Crypto", "News", "Social", "Productivity", "Development", "Analytics"];

export default function MarketplacePage() {
	const [category, setCategory] = useState("All");
	const [detailsAgent, setDetailsAgent] = useState<any>(null);
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [open, setOpen] = useState(false);

	// live listings from on‐chain marketplace
	const [listings, setListings] = useState<any[]>([]);

	const wallet = useCurrentAccount();
	const signAndExecute = useSignExecuteAndWaitForTransaction();
	const { caps } = useOwnedCaps();

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
	const handlePurchase = async (agent: any) => {
		if (!wallet?.address) {
			toast({ title: "Connect your wallet", variant: "destructive" });
			return;
		}
		toast({ title: "Purchasing agent...", description: "Confirm in wallet…" });
		try {
			const MARKET = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID!;

			// seller’s kiosk that holds the listing
			const sellerKioskId = agent.fields.kiosk_id;
			// the agent cap id to purchase
			const agentCapId     = agent.fields.agent_id;

			// your own KioskOwnerCap → needed for transfer policy
			const kioskCap = caps.find((c) => c.data.type === "0x2::kiosk::KioskOwnerCap");
			if (!kioskCap) throw new Error("No KioskOwnerCap found for your account");
			const policyId = kioskCap.data.objectId;

			// NOTE: purchaseAgent expects:
			//   (marketplaceObj, sellerKioskObj, agentCapId, policyObj, paymentCoinObj)
			// Here we re-use the same cap object as the “paymentCoinObj”  
			// (you can swap in a specific coin if needed)
			const tx = purchaseAgent(
				MARKET,
				sellerKioskId,
				agentCapId,
				policyId,
				policyId
			);

			await signAndExecute(tx);
			toast({ title: "Purchase successful", description: "Agent acquired!" });
			fetchListings();
		} catch (err: any) {
			console.error("purchaseAgent failed", err);
			toast({
				title: "Purchase failed",
				description: err?.message || "See console for details",
				variant: "destructive",
			});
		}
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
