"use client";

import Header from "@/components/header";
import { getAgentInfo } from "@/lib/actions/get-agent-info";
import { useState, useEffect, useCallback, useMemo } from "react";
import { FilterBar } from "@/components/marketplace/FilterBar";
import { ListingsGrid } from "@/components/marketplace/ListingsGrid";
import { CreateListingDialog } from "@/components/marketplace/CreateListingDialog";
import { AgentDetailsDialog } from "@/components/marketplace/AgentDetailsDialog";
import { readDynamicFields } from "@/lib/marketplace-utils";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSignExecuteAndWaitForTransaction } from "@/hooks/use-sign";
import { useOwnedCaps } from "@/hooks/use-owned-caps";
import { Transaction } from "@mysten/sui/transactions";
import { toast } from "@/hooks/use-toast";
import Image from "next/image";
import { PageTransition } from "@/components/page-transition";

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
		return category === "All" ? listings : listings.filter((l) => (l.fields.category ?? "All") === category);
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
			// ── fetch DB record to get the on‐chain AgentCap ID ───────────────
			const dbAgent = await getAgentInfo(undefined, agent.fields.agent_id);
			if (!dbAgent) throw new Error("Agent not found in database");
			const agentCapId = dbAgent.capId;

			const MARKET = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID!;
			const POLICY = process.env.NEXT_PUBLIC_MP_POLICY_ID!;

			// seller’s kiosk that holds the listing
			const sellerKioskId = agent.fields.kiosk_id;

			// your own KioskOwnerCap → needed for transfer policy
			const kioskCap = caps.find((c) => c.data.type === "0x2::kiosk::KioskOwnerCap");
			if (!kioskCap) throw new Error("No KioskOwnerCap found for your account");

			// build tx manually so we can split off exactly the payment coin
			const tx = new Transaction();

			// amount in mist is stored on the listing
			const priceMist = BigInt(agent.fields.price);
			const marketFee = (priceMist * BigInt(5)) / BigInt(100);
			// split gas coin for the exact payment amount
			const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64((priceMist + marketFee).toString())]);
			console.log({ sellerKioskId, agentCapId, POLICY });

			tx.moveCall({
				target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent_marketplace::purchase_agent`,
				arguments: [
					tx.object(MARKET),
					tx.object(sellerKioskId),
					tx.pure.id(agentCapId),
					tx.object(POLICY),
					paymentCoin,
				],
			});

			// sign & execute
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
			<PageTransition>
				<Header />
				<section className="container mx-auto px-4 py-8">
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
			</PageTransition>
		</main>
	);
}
