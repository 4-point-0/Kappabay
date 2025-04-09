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
	isLoading,
}: {
	nftObjectId: string;
	capObjectId: string;
	onCancel: () => void;
	onSend: (toAddress: string) => void;
	isLoading: boolean;
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
				<Button onClick={() => onSend(recipientAddress)} disabled={isLoading}>
					{isLoading ? (
						<>
							<svg
								className="animate-spin -ml-1 mr-2 h-4 text-white"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							Sending...
						</>
					) : (
						"Send"
					)}
				</Button>
			</div>
		</>
	);
}
