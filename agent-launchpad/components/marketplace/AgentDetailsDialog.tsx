"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Star } from "lucide-react";
import { AddressShort } from "../address-short";

interface DetailsDialogProps {
	agent: any;
	open: boolean;
	onOpenChange: (b: boolean) => void;
	onPurchase: (a: any) => void;
}

export function AgentDetailsDialog({ agent, open, onOpenChange, onPurchase }: DetailsDialogProps) {
	if (!agent) return null;
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{agent.fields.name}</DialogTitle>
					<DialogDescription>{agent.fields.description}</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="flex items-center gap-4">
						<img
							src={agent.fields.image_url || "/placeholder.svg"}
							alt={agent.fields.name}
							className="w-20 h-20 object-cover rounded-md"
						/>
						<div>
							<Badge variant="outline">{agent.fields.category || "All"}</Badge>
							<p className="font-medium text-lg mt-1">{(Number(agent.fields.price) / 1e9).toFixed(3)} SUI</p>
						</div>
					</div>
					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Seller:</span>
							<AddressShort address={agent.fields.seller} endIndex={30} />
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Listed:</span>
							<span>{new Date(Number(agent.fields.creation_time)).toLocaleDateString()}</span>
						</div>
					</div>
				</div>
				<DialogFooter className="sm:justify-between">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Close
					</Button>
					<Button onClick={() => onPurchase(agent)}>Purchase</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
