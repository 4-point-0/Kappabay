"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wand2, Loader2 } from "lucide-react";
import BasicInfoTab from "@/components/deployer/basic-info-tab";
import PersonalityTab from "@/components/deployer/personality-tab";
import ExamplesTab from "@/components/deployer/examples-tab";
import PluginsTab from "@/components/deployer/plugins-tab";
import AdvancedTab from "@/components/deployer/advanced-tab";
import AiAssistModal from "@/components/deployer/ai-assist-modal";
import ImportExportButtons from "@/components/deployer/import-export-buttons";
import KnowledgeTab from "@/components/deployer/knowledge-tab";
import { defaultAgentConfig } from "@/lib/default-config";
import type { AgentConfig } from "@/lib/types";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSignExecuteAndWaitForTransaction } from "@/hooks/use-sign";
import { toast } from "@/hooks/use-toast";
import { generateCharacter } from "@/lib/actions/generate-character";
import { deployAgent } from "@/lib/deploy-agent";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { serializeAgentConfig } from "@/lib/utils";
import { updateAgentConfig, persistAgentConfig } from "@/lib/actions/update-agent-config";
import { useSignTransaction, useSuiClient } from "@mysten/dapp-kit";

interface AgentDeployerProps {
	initialConfig?: AgentConfig;
	isConfiguring?: boolean;
	agentId?: string;
}

export default function AgentDeployer({
	initialConfig = defaultAgentConfig,
	isConfiguring = false,
	agentId,
}: AgentDeployerProps) {
	const account = useCurrentAccount();
	const signAndExec = useSignExecuteAndWaitForTransaction();
	const [agentConfig, setAgentConfig] = useState<AgentConfig>(initialConfig);
	const [isDeploying, setIsDeploying] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	// new: dialog state + user‐entered prompt
	const [isAiModalOpen, setIsAiModalOpen] = useState(false);
	const [aiDescription, setAiDescription] = useState("");
	const [imageUrl, setImageUrl] = useState<string>("");
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (initialConfig.image) {
			setImageUrl(initialConfig.image);
		}
	}, []);

	const handleChange = (field: string, value: any) => {
		setAgentConfig((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleNestedChange = (parent: string, field: string, value: any) => {
		setAgentConfig((prev: any) => ({
			...prev,
			[parent]: {
				...prev[parent],
				[field]: value,
			},
		}));
	};

	const handleArrayChange = (field: string, index: number, value: string) => {
		setAgentConfig((prev: any) => {
			const newArray = [...prev[field]];
			newArray[index] = value;
			return {
				...prev,
				[field]: newArray,
			};
		});
	};

	const handleArrayAdd = (field: string) => {
		setAgentConfig((prev: any) => ({
			...prev,
			[field]: [...prev[field], ""],
		}));
	};

	const handleArrayRemove = (field: string, index: number) => {
		setAgentConfig((prev: any) => ({
			...prev,
			[field]: prev[field].filter((_: any, i: number) => i !== index),
		}));
	};

	const exportConfig = () => {
		const dataStr = JSON.stringify(agentConfig, null, 2);
		const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

		const exportFileDefaultName = `${agentConfig.name.toLowerCase().replace(/\s+/g, "-")}-config.json`;

		const linkElement = document.createElement("a");
		linkElement.setAttribute("href", dataUri);
		linkElement.setAttribute("download", exportFileDefaultName);
		linkElement.click();
	};

	const importConfig = () => {
		fileInputRef.current?.click();
	};

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const config = JSON.parse(e.target?.result as string);
				setAgentConfig(config);
			} catch (error) {
				console.error("Error parsing JSON:", error);
				alert("Invalid JSON file");
			}
		};
		reader.readAsText(file);
	};

	const handleDeploy = async () => {
		if (!account?.address) return toast({ title: "Connect your wallet", variant: "destructive" });
		setIsDeploying(true);
		try {
			if (imageUrl) {
				agentConfig.image = imageUrl;
			}
			const result = await deployAgent(agentConfig, signAndExec, account.address, "agent-deployer");
			if (result.success) {
				toast({
					title: "Agent deployed successfully",
					description: `Agent ID: ${result.agentId}`,
				});
			} else {
				toast({
					title: "Deployment Error",
					description: result.error || "Unknown error",
					variant: "destructive",
				});
			}
		} catch (err: any) {
			toast({
				title: err.message || "Deployment Error",
				description: "Failed to deploy",
				variant: "destructive",
			});
			console.error(err);
		} finally {
			setIsDeploying(false);
		}
	};

	// new: update just the config of an existing agent
	const { mutateAsync: signTransaction } = useSignTransaction();
	const suiClient = useSuiClient();

	const handleUpdate = async () => {
		if (!agentId || !account?.address) return toast({ title: "Connect your wallet", variant: "destructive" });
		if (imageUrl) {
			agentConfig.image = imageUrl;
		}

		setIsDeploying(true);
		try {
			// 1) ask backend to build & agent-sign the tx
			const { presignedTxBytes, agentSignature, adminCapId, agentObjectId, agentAddress } = await updateAgentConfig(
				agentId,
				agentConfig,
				account.address
			);

			// 2) replicate the exact same Move call locally to get the sponsor‐signature
			const tx = new Transaction();
			const raw = Array.from(Buffer.from(serializeAgentConfig(agentConfig)));
			tx.moveCall({
				target: `${process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID}::agent::update_configuration`,
				arguments: [tx.object(agentObjectId), tx.object(adminCapId), tx.pure(bcs.vector(bcs.u8()).serialize(raw))],
			});
			tx.setSender(agentAddress);
			tx.setGasOwner(account.address);

			const walletSigned = await signTransaction({ transaction: tx });

			// 3) submit the sponsored tx with both signatures
			const result = await suiClient.executeTransactionBlock({
				transactionBlock: presignedTxBytes,
				signature: [agentSignature, walletSigned.signature],
				requestType: "WaitForLocalExecution",
				options: {
					showEffects: true,
					showEvents: true,
				},
			});

			if (result.effects?.status.status === "success") {
				// 4) now persist the JSON in Prisma
				await persistAgentConfig(agentId, agentConfig);
				toast({ title: "Configuration updated" });
			} else {
				throw new Error("On-chain update failed: ", result.effects?.status?.error as any);
			}
		} catch (err: any) {
			toast({
				title: "Update Error",
				description: err.message,
				variant: "destructive",
			});
		} finally {
			setIsDeploying(false);
		}
	};

	const handleGenerateCharacter = async (description: string) => {
		setIsGenerating(true);
		const formData = new FormData();
		formData.append("description", description);
		try {
			const { config, error } = await generateCharacter(formData);
			if (error) {
				toast({
					title: "AI Assist Error",
					description: Array.isArray(error.description) ? error.description.join(", ") : JSON.stringify(error),
					variant: "destructive",
				});
			} else if (config) {
				setAgentConfig(config);
				toast({
					title: "AI Assist",
					description: "Agent configuration generated successfully",
				});
				setIsAiModalOpen(false);
				setAiDescription("");
			}
		} catch (err) {
			toast({
				title: "AI Assist Error",
				description: "Failed to generate config",
				variant: "destructive",
			});
			console.error(err);
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div className="space-y-1">
					<h2 className="text-2xl font-semibold">Agent Configuration</h2>
					<p className="text-sm text-gray-500">Configure your agent parameters</p>
				</div>
				<div className="flex space-x-2">
					<ImportExportButtons importConfig={importConfig} exportConfig={exportConfig} fileInputRef={fileInputRef} />
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="outline" onClick={() => setIsAiModalOpen(true)} disabled={isGenerating}>
									<Wand2 className="mr-2 h-4 w-4" />
									AI Assist
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>AI assisted parameter generation</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
					<AiAssistModal
						open={isAiModalOpen}
						onOpenChange={setIsAiModalOpen}
						aiDescription={aiDescription}
						setAiDescription={setAiDescription}
						isGenerating={isGenerating}
						onGenerate={handleGenerateCharacter}
					/>
				</div>
			</div>

			<Tabs defaultValue="basic" className="w-full">
				<TabsList className="grid grid-cols-5 w-full bg-background">
					<TabsTrigger value="basic">Basic Info</TabsTrigger>
					<TabsTrigger value="personality">Personality</TabsTrigger>
					<TabsTrigger value="examples">Examples</TabsTrigger>
					<TabsTrigger value="plugins">Integrations</TabsTrigger>
					<TabsTrigger value="advanced">Advanced</TabsTrigger>
					{isConfiguring && <TabsTrigger value="knowledge">Knowledge</TabsTrigger>}
				</TabsList>

				<TabsContent value="basic" className="space-y-4 mt-4">
					<BasicInfoTab
						agentConfig={agentConfig}
						imageUrl={imageUrl}
						setImageUrl={setImageUrl}
						handleChange={handleChange}
						handleNestedChange={handleNestedChange}
					/>
				</TabsContent>

				<TabsContent value="personality" className="space-y-4 mt-4">
					<PersonalityTab
						agentConfig={agentConfig}
						handleArrayChange={handleArrayChange}
						handleArrayAdd={handleArrayAdd}
						handleArrayRemove={handleArrayRemove}
					/>
				</TabsContent>

				<TabsContent value="examples" className="space-y-4 mt-4">
					<ExamplesTab
						agentConfig={agentConfig}
						setAgentConfig={setAgentConfig}
						handleArrayChange={handleArrayChange}
						handleArrayAdd={handleArrayAdd}
						handleArrayRemove={handleArrayRemove}
					/>
				</TabsContent>

				<TabsContent value="plugins" className="space-y-4 mt-4">
					<PluginsTab
						agentConfig={agentConfig}
						onPluginChange={(plugs) => setAgentConfig((prev) => ({ ...prev, plugins: plugs }))}
						onEnvChange={(env) => setAgentConfig((prev) => ({ ...prev, env }))}
					/>
				</TabsContent>

				<TabsContent value="advanced" className="space-y-4 mt-4">
					<AdvancedTab agentConfig={agentConfig} handleChange={handleChange} />
				</TabsContent>
				{isConfiguring && (
					<TabsContent value="knowledge" className="space-y-4 mt-4">
						<KnowledgeTab agentId={agentId!} />
					</TabsContent>
				)}
			</Tabs>

			<div className="flex justify-end mt-8">
				<Button size="lg" onClick={isConfiguring ? handleUpdate : handleDeploy} disabled={isDeploying}>
					{isDeploying ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							{isConfiguring ? "Updating..." : "Deploying..."}
						</>
					) : isConfiguring ? (
						"Update Agent"
					) : (
						"Deploy Agent"
					)}
				</Button>
			</div>
		</div>
	);
}
