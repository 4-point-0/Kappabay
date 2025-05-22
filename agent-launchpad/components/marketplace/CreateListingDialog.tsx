"use client";
import { useState, useEffect } from "react";
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { Button } from "../ui/button";
import { toast } from "@/hooks/use-toast";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSignExecuteAndWaitForTransaction } from "@/hooks/use-sign";
import { useOwnedCaps } from "@/hooks/use-owned-caps";
import { Transaction } from "@mysten/sui/transactions";
import { getAgentsByCapIds } from "@/lib/actions/get-agents-info";
import { listAgent } from "@/lib/marketplace-utils";

export function CreateListingDialog({
	open,
	setOpen,
	allCategories,
	onCreate,
}: {
	open: boolean;
	setOpen: (val: boolean) => void;
	allCategories: string[];
	onCreate: () => void;
}) {
	// dialog open + form state

	const [ownedAgents, setOwnedAgents] = useState<any[]>([]);
	const [agentId, setAgentId] = useState("");
	const [category, setCategory] = useState("");
	const [price, setPrice] = useState("");

	const wallet = useCurrentAccount();
	// include the refetch function so we can reload caps after creating a kiosk
	const { caps, refetch: refetchCaps } = useOwnedCaps();
	const signer = useSignExecuteAndWaitForTransaction();

	// load owned agents
	useEffect(() => {
		const capIds = caps.filter((c) => c.data.type.includes("::agent::AgentCap")).map((c) => c.data.objectId);
		if (capIds.length) getAgentsByCapIds(capIds).then(setOwnedAgents).catch(console.error);
	}, [caps]);

	const handleSubmit = async () => {
		if (!wallet?.address || !agentId || !category || !price) {
			toast({ title: "Missing info", description: "Fill all fields", variant: "destructive" });
			return;
		}
		toast({ title: "Submitting listing", description: "Confirm in wallet…" });
		try {
			// derive on-chain IDs
			const MARKET = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID!;
			const selCap = caps.find((c) => c.data.content.fields.agent_id === agentId);
			if (!selCap) throw new Error("AgentCap missing");
			const agentCapId = selCap.data.objectId;
			// see if user has a KioskOwnerCap
			let kioskCap = caps.find((c) => c.data.type === "0x2::kiosk::KioskOwnerCap");
			if (!kioskCap) {
				// prompt creation of a kiosk
				toast({
					title: "No kiosk cap found",
					description: "Creating your kiosk… Confirm in wallet",
					variant: "destructive",
				});
				const txCreate = new Transaction();
				txCreate.moveCall({
					target: "0x2::kiosk::create_user_kiosk",
					arguments: [],
				});
				await signer(txCreate);
				toast({
					title: "Kiosk created",
					description: "Fetching your new kiosk cap…",
				});

				// refresh owned caps from chain
				const { data: newCaps } = await refetchCaps();
				if (!newCaps) throw new Error("Failed to refresh kiosk caps");
				kioskCap = newCaps.find((c) => c.data.type === "0x2::kiosk::KioskOwnerCap");
				if (!kioskCap) throw new Error("KioskOwnerCap still missing after creation");
			}

			const {
				objectId: kioskCapId,
				content: {
					fields: { for: kioskId },
				},
			} = kioskCap.data;

			const tx = listAgent(
				MARKET,
				agentCapId,
				agentId,
				kioskId,
				kioskCapId,
				BigInt(Math.round(Number(price) * 1e9)).toString(),
				"",
				"",
				""
			);
			await signer(tx);
			toast({ title: "Listing successful", description: "Agent is now live." });
			setOpen(false);
			setAgentId("");
			setCategory("");
			setPrice("");
		} catch (e: any) {
			console.error(e);
			toast({ title: "Listing failed", description: e.message, variant: "destructive" });
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{/* You can render a button outside if desired */}
				<div />
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create New Listing</DialogTitle>
					<DialogDescription>Select one of your agents</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="space-y-2">
						<Label>Owned Agents</Label>
						<Select value={agentId} onValueChange={setAgentId}>
							<SelectTrigger>
								<SelectValue placeholder="Pick an agent" />
							</SelectTrigger>
							<SelectContent>
								{ownedAgents.map((a) => (
									<SelectItem key={a.objectId} value={a.objectId}>
										{a.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label>Category</Label>
						<Select value={category} onValueChange={setCategory}>
							<SelectTrigger>
								<SelectValue placeholder="Pick an agent category" />
							</SelectTrigger>
							<SelectContent>
								{allCategories.map((category: string) => (
									<SelectItem key={category} value={category}>
										{category}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label>Price (SUI)</Label>
						<Input
							placeholder="0.5"
							type="number"
							step="0.1"
							value={price}
							onChange={(e) => setPrice(e.target.value)}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button onClick={handleSubmit}>Create Listing</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
