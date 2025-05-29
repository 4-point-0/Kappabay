"use client";
import React, { useState, useRef, useEffect, use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSignTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { updateKnowledgeBank } from "@/lib/actions/update-knowledgebank";
import { PlusCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { getAgentInfo } from "@/lib/actions/get-agent-info";
import { Agent } from "@prisma/client";

function FilePreview({ file }: { file: File }) {
	const [text, setText] = useState<string>("");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setLoading(true);
		file.text().then((t) => {
			setText(t);
			setLoading(false);
		});
	}, [file]);

	if (loading) {
		return (
			<div className="p-4 flex justify-center">
				<Loader2 className="h-6 w-6 animate-spin" />
			</div>
		);
	}

	return (
		<ScrollArea className="h-60 w-full">
			<pre className="p-2 text-sm whitespace-pre-wrap">{text}</pre>
		</ScrollArea>
	);
}

interface Props {
	agentId: string;
	/** called once with our upload fn so parent can trigger it */
	onRegisterUpload?: (fn: () => void) => void;
}

export default function KnowledgeTab(props: Props) {
	const { agentId, onRegisterUpload } = props;
	// wallet + Sui execution hook
	const account = useCurrentAccount();
	// we'll use the raw signTransaction + suiClient for sponsored submission
	const { mutateAsync: signTransaction } = useSignTransaction();
	const suiClient = useSuiClient();
	// keep a real array so we can add/remove individual items
	const [files, setFiles] = useState<File[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [agent, setAgent] = useState<Omit<Agent, "agentWalletKey"> | null>(null);

	useEffect(() => {
		getAgentInfo(agentId).then(setAgent);
	}, [agentId]);

	const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selected = e.target.files;
		if (!selected) return;
		// filter only .txt/.md
		const valid = Array.from(selected).filter((f) => [".txt", ".md"].some((ext) => f.name.endsWith(ext)));
		if (!valid.length) {
			return toast({ title: "Only .txt or .md files allowed", variant: "destructive" });
		}
		// append new files (no duplicates by name)
		setFiles((prev) => [...prev, ...valid.filter((f) => !prev.some((p) => p.name === f.name))]);
		// clear input so same file can be picked again later
		e.target.value = "";
	};

	const removeFile = (idx: number) => {
		setFiles((prev) => prev.filter((_, i) => i !== idx));
	};

	const handleUpload = async () => {
		if (!files.length || !agentId || !agent || !account?.address) {
			return toast({ title: "Select files and connect wallet", variant: "destructive" });
		}
		try {
			// 1) combine all file texts
			const texts = await Promise.all(files.map((f) => f.text()));
			const combined = texts.join("\n");

			// 2) server-side: build & agent-sign the tx
			const {
				presignedTxBytes,
				agentSignature,
				agentAddress,
				adminCapId,
				agentObjectId,
			} = await updateKnowledgeBank(agentId, combined);

			// 3) client-side: replicate the same Move call so we can sign as gas sponsor
			const sponsorTx = new Transaction();
			sponsorTx.moveCall({
				target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::update_knowledgebank`,
				arguments: [
					sponsorTx.object(agentObjectId),
					sponsorTx.object(adminCapId),
					sponsorTx.pure(bcs.vector(bcs.u8()).serialize(new TextEncoder().encode(combined))),
				],
			});
			sponsorTx.setSender(agentAddress);
			sponsorTx.setGasOwner(account.address);

			// 4) get sponsor signature
			const { signature: sponsorSig } = await signTransaction({ transaction: sponsorTx });

			// 5) submit the presigned bytes + both signatures
			const result = await suiClient.executeTransactionBlock({
				transactionBlock: presignedTxBytes,
				signature: [agentSignature, sponsorSig],
				requestType: "WaitForLocalExecution",
				options: { showEffects: true, showEvents: true, showObjectChanges: true },
			});
			if (result.effects?.status.status !== "success")
				throw new Error("On-chain update failed");

			toast({ title: "Knowledgebank updated on-chain" });

			// 6) finally hit your HTTP RAG endpoint
			const form = new FormData();
			files.forEach((f) => form.append("files", f));
			const res = await fetch(`http://localhost:3050/agents/${agentId}/knowledge`, {
				method: "POST",
				body: form,
			});
			if (!res.ok) throw new Error(await res.text());
			toast({ title: "Knowledge uploaded via API" });
			setFiles([]);
		} catch (err: any) {
			toast({ title: "Upload failed", description: err.message || String(err), variant: "destructive" });
		}
	};

	// once handleUpload stable, give it to parent
	useEffect(() => {
		onRegisterUpload?.(handleUpload);
	}, [handleUpload, onRegisterUpload]);

	return (
		<Card>
			<CardContent className="pt-6 space-y-6">
				<div className="space-y-2">
					<div className="flex justify-between items-center">
						<Label className="capitalize">Knowledge Files</Label>
						<Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
							<PlusCircle className="h-4 w-4 mr-1" /> Add
						</Button>
					</div>
					<input type="file" multiple accept=".txt,.md" className="hidden" ref={fileInputRef} onChange={handleFiles} />
					<div className="flex flex-wrap gap-3">
						{files.map((file, idx) => (
							<Badge key={idx} className="flex items-center gap-1 px-3 py-1">
								<Dialog>
									<DialogTrigger asChild>
										<span className="cursor-pointer underline">{file.name}</span>
									</DialogTrigger>
									<DialogContent className="p-2 max-w-xl">
										<DialogHeader className="py-2">
											<DialogTitle className="px-2">{file.name}</DialogTitle>
										</DialogHeader>
										<FilePreview file={file} />
										<DialogFooter>
											<DialogClose asChild>
												<Button variant="ghost">Close</Button>
											</DialogClose>
										</DialogFooter>
									</DialogContent>
								</Dialog>
								<Button size="icon" onClick={() => removeFile(idx)}>
									<Trash2 className="h-3 w-3" />
								</Button>
							</Badge>
						))}
					</div>
				</div>
				<div className="flex justify-end">
					<Button onClick={handleUpload} disabled={!files.length}>
						Upload
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
