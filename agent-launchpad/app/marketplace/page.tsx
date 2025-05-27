"use client";

import Header from "@/components/header";
import { getAgentInfo } from "@/lib/actions/get-agent-info";
import { useState, useEffect, useCallback, useMemo } from "react";
import { FilterBar } from "@/components/marketplace/FilterBar";
import { ListingsGrid } from "@/components/marketplace/ListingsGrid";
import { CreateListingDialog } from "@/components/marketplace/CreateListingDialog";
import { AgentDetailsDialog } from "@/components/marketplace/AgentDetailsDialog";
import { readDynamicFields } from "@/lib/marketplace-utils";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useSignExecuteAndWaitForTransaction } from "@/hooks/use-sign";
import { useOwnedCaps } from "@/hooks/use-owned-caps";
import { Transaction } from "@mysten/sui/transactions";
import { toast } from "@/hooks/use-toast";
import { useMarketplaceObject } from "@/hooks/use-marketplace-object";
import Image from "next/image";
import { PageTransition } from "@/components/page-transition";
import { getObjectFields } from "@/lib/actions/sui-utils";

// All available categories
const allCategories = ["All", "Finance", "Crypto", "News", "Social", "Productivity", "Development", "Analytics"];

export default function MarketplacePage() {
	const [category, setCategory] = useState("All");
	const [detailsAgent, setDetailsAgent] = useState<any>(null);
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [open, setOpen] = useState(false);

	// live listings from on‐chain marketplace
	const [listings, setListings] = useState<any[]>([]);
	const suiClient = useSuiClient();
	const wallet = useCurrentAccount();
	const signAndExecute = useSignExecuteAndWaitForTransaction();
	const { caps, refetch: refetchCaps } = useOwnedCaps();

	const MARKET_ID = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID!;
	const { fields: marketFields } = useMarketplaceObject(MARKET_ID);

	const fetchListings = useCallback(async () => {
		try {
			const raw = await readDynamicFields();

			const enriched = await Promise.all(
				raw.map(async (item: any) => {
					const agentId = item.fields.agent_id;
					let image_url = item.fields.image_url || "";

					try {
						const fields = await getObjectFields(suiClient, agentId);
						if (fields?.image) {
							image_url = fields.image;
						}
					} catch (e) {
						console.warn("Failed to fetch on-chain object", agentId, e);
					}

					return {
						...item,
						fields: {
							...item.fields,
							image_url,
						},
					};
				})
			);

			setListings(enriched);
		} catch (err) {
			console.error("Failed to load marketplace listings:", err);
		}
	}, [suiClient]);

	// initial load + poll every 20s (cleanup on unmount)
	useEffect(() => {
		fetchListings();
		const id = setInterval(fetchListings, 20_000);
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

			// ensure user has a KioskOwnerCap, creating one if missing
			let kioskCap = caps.find((c) => c.data.type === "0x2::kiosk::KioskOwnerCap");
			if (!kioskCap) {
				toast({ title: "No kiosk cap found", description: "Creating your kiosk… Confirm in wallet" });
				// build and submit creation tx
				const txCreate = new Transaction();
				txCreate.moveCall({
					target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent_marketplace::create_user_kiosk`,
					arguments: [],
				});
				await signAndExecute(txCreate);
				toast({ title: "Kiosk created", description: "Fetching your new kiosk cap…" });

				// refetch caps and wait up to 5s for the new kiosk cap
				const maxRetries = 5;
				for (let i = 0; i < maxRetries; i++) {
					const res = await refetchCaps();
					const newCaps = res.data ?? [];
					kioskCap = newCaps.find((c) => c.data.type === "0x2::kiosk::KioskOwnerCap");
					if (kioskCap) break;
					await new Promise((r) => setTimeout(r, 1000));
				}
				if (!kioskCap) {
					throw new Error("KioskOwnerCap still missing after multiple retries");
				}
			}

			// now you can safely read your kioskCap data

			// build tx manually so we can split off exactly the payment coin
			const {
				objectId: kioskCapId,
				content: { fields: { for: kioskId } }
			} = kioskCap.data;

			const tx = new Transaction();

			// amount in mist is stored on the listing
			const priceMist = BigInt(agent.fields.price);
			// ── read royalty pct from on-chain marketplace object ───────────
			const pct = BigInt(marketFields?.royalty_percentage ?? 500);
			const marketFee = (priceMist * BigInt(pct)) / BigInt(10000);
			// split gas coin for the exact payment amount
			const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64((priceMist + marketFee).toString())]);

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
