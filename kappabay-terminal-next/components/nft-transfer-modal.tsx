"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PotatoTransferModal({
	nftObjectId,
	capObjectId,
	onCancel,
	onSend,
}: {
	nftObjectId: string;
	capObjectId: string;
	onCancel: () => void;
	onSend: (toAddress: string) => void;
}) {
	const [recipientAddress, setRecipientAddress] = useState("");
	return (
		<>
			<div className="grid gap-4 py-4">
				<div className="grid grid-cols-4 items-center gap-4">
					<Label htmlFor="nftId" className="text-right">
						Potato ID
					</Label>
					<Input id="nftId" value={nftObjectId} className="col-span-3" readOnly />
				</div>
				<div className="grid grid-cols-4 items-center gap-4">
					<Label htmlFor="to" className="text-right">
						To
					</Label>
					<Input 
						id="to" 
						placeholder="Enter recipient SUI address" 
						className="col-span-3" 
						value={recipientAddress}
						onChange={(e) => setRecipientAddress(e.target.value)}
					/>
				</div>
			</div>
			<div className="flex justify-end gap-2">
				<Button variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button onClick={() => onSend(recipientAddress)}>Send</Button>
			</div>
		</>
	);
}
