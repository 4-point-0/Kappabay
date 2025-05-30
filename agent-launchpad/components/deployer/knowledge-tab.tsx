"use client";
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSignTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import {
	updateKnowledgeBank,
	persistKnowledgeBlob,
	updateKnowledgeBlobWalrus,
} from "@/lib/actions/update-knowledgebank";
import { PlusCircle, Trash2, Loader2 } from "lucide-react";
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
import { getAgentInfo } from "@/lib/actions/get-agent-info";
import { Agent } from "@prisma/client";
import { getObjectFields } from "@/lib/actions/sui-utils";
import { apiClient } from "@/lib/api";
import { FilePreview } from "./file-preview";

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
	const [isClearing, setIsClearing] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	// store full on‐chain Move object fields
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [agent, setAgent] = useState<Omit<Agent, "agentWalletKey"> | null>(null);
	const [runtimeAgentId, setRuntimeAgentId] = useState<string | null>(null);

	useEffect(() => {
		getAgentInfo(agentId).then(async (result) => {
			setAgent(result);
			const resp = await apiClient.getAgents(result?.publicAgentUrl!);
			setRuntimeAgentId(resp.agents?.[0].id);
		});
	}, [agentId]);

	// unified loader: fetch on-chain knowledgebank, decode, wrap in File[]
	const refreshKnowledgeFiles = async () => {
		if (!agent?.objectId) return;
		const fields = await getObjectFields(suiClient, agent.objectId);
		const kb = fields.knowledgebank;
		const text = Array.isArray(kb) ? new TextDecoder().decode(new Uint8Array(kb)) : "";
		if (!text) return;
		const existingFile = new File([text], "existing-knowledge.txt", {
			type: "text/plain",
		});
		setFiles([existingFile]);
	};

	// run on mount / when agent.objectId changes
	useEffect(() => {
		refreshKnowledgeFiles();
	}, [agent?.objectId, suiClient]);

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

	// shared on‐chain + sponsor logic
	const sendChainUpdate = async (text: string) => {
		if (!account?.address) return toast({ title: "Connect wallet", variant: "destructive" });
		debugger;
		const { presignedTxBytes, agentSignature, agentAddress, adminCapId, objectId } = await updateKnowledgeBank(
			agentId,
			text,
			account.address
		);

		const tx = new Transaction();
		tx.moveCall({
			target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::update_knowledgebank`,
			arguments: [
				tx.object(objectId),
				tx.object(adminCapId),
				tx.pure(bcs.vector(bcs.u8()).serialize(new TextEncoder().encode(text))),
			],
		});
		tx.setSender(agentAddress);
		tx.setGasOwner(account.address);

		const { signature: sponsorSig } = await signTransaction({ transaction: tx });
		const result = await suiClient.executeTransactionBlock({
			transactionBlock: presignedTxBytes,
			signature: [agentSignature, sponsorSig],
			requestType: "WaitForLocalExecution",
			options: { showEffects: true },
		});
		if (result.effects?.status.status !== "success") {
			throw new Error("On-chain update failed");
		}
	};

	const handleUpload = async () => {
		if (!files.length || !agentId || !agent || !account?.address || !runtimeAgentId) {
			return toast({ title: "Select files and connect wallet", variant: "destructive" });
		}
		setIsUploading(true);
		try {
			// 1) combine all file texts
			const texts = await Promise.all(files.map((f) => f.text()));
			const combined = texts.join("\n");

			// 1.5) upload combined to Walrus
			const newBlobId = await updateKnowledgeBlobWalrus(combined);

			// persist in our DB & local state
			await persistKnowledgeBlob(agentId, newBlobId);
			setAgent((prev) => prev && { ...prev, knowledgeBlobId: newBlobId });

			// 2) run on-chain update
			await sendChainUpdate(combined);
			toast({ title: "Knowledgebank updated on-chain" });

			// 3) upload via REST client
			const base = agent.publicAgentUrl!;
			await apiClient.removeKnowledge(runtimeAgentId, base);
			await apiClient.addKnowledge(runtimeAgentId, files, base);
			await refreshKnowledgeFiles();
			toast({ title: "Knowledge uploaded via API" });
		} catch (err: any) {
			toast({ title: "Upload failed", description: err.message || String(err), variant: "destructive" });
		} finally {
			setIsUploading(false);
		}
	};

	// new handler: clear existing knowledge
	const handleClear = async () => {
		if (!agentId || !agent || !account?.address || !runtimeAgentId) {
			return toast({ title: "Connect wallet & select agent", variant: "destructive" });
		}
		setIsClearing(true);
		try {
			// reset chain to empty vector
			await sendChainUpdate("");
			toast({ title: "On-chain knowledge cleared" });

			// clear via REST
			const base = agent.publicAgentUrl!;
			await apiClient.removeKnowledge(runtimeAgentId, base);

			// delete and clear our DB/state
			if (agent.knowledgeBlobId) {
				await persistKnowledgeBlob(agentId, null);
				setAgent((prev) => prev && { ...prev, knowledgeBlobId: null });
			}

			setFiles([]);
			toast({ title: "API knowledge cleared" });
		} catch (err: any) {
			toast({ title: "Clear failed", description: err.message, variant: "destructive" });
		} finally {
			setIsClearing(false);
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
					<div className="flex space-x-2">
						<Button onClick={handleUpload} disabled={!files.length || isUploading}>
							{isUploading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
							{isUploading ? "Uploading..." : "Upload"}
						</Button>
						<Button variant="outline" onClick={handleClear} disabled={isClearing}>
							{isClearing ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
							{isClearing ? "Clearing..." : "Clear Existing Knowledge"}
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
