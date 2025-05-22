"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/header";
import AgentDeployer from "@/components/agent-deployer";
import { defaultAgentConfig } from "@/lib/default-config";
import type { AgentConfig } from "@/lib/types";
import { PageTransition } from "@/components/page-transition";
import { motion } from "framer-motion";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { getAgentInfo } from "@/lib/actions/get-agent-info";

// fetch on‐chain agent configuration
const fetchAgentConfig = async (id: string): Promise<AgentConfig> => {
	// 1) load the DB record (and get its objectId)
	const agent = await getAgentInfo(id);
	if (!agent?.objectId) {
		throw new Error(`Agent ${id} missing objectId`);
	}

	// 2) fetch the NFT object from Sui
	const client = new SuiClient({ url: getFullnodeUrl("testnet") });
	const suiObj = await client.getObject({
		id: agent.objectId,
		options: { showContent: true },
	});
	if (!suiObj.data?.content) {
		throw new Error(`On‐chain object ${agent.objectId} not found`);
	}
	// 3) pull the live configuration out of its fields
	//    config comes back as a number[][] (chunks of u8)
	const raw: number[][] = (suiObj.data.content as any).fields.configuration;
	// flatten into one big byte array
	const flat = raw.flat();
	// decode into a UTF-8 string
	const jsonText = new TextDecoder().decode(Uint8Array.from(flat));
	console.log("JSON.parse(jsonText)", JSON.parse(jsonText));
	console.log("suiObj", suiObj);

	// parse into your AgentConfig
	return JSON.parse(jsonText) as AgentConfig;
};

export default function ConfigurePage() {
	const params = useParams();
	const id = params.id as string;
	const [loading, setLoading] = useState(true);
	const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);

	useEffect(() => {
		const loadConfig = async () => {
			try {
				const config = await fetchAgentConfig(id);
				setAgentConfig(config);
			} catch (error) {
				console.error("Failed to load agent config:", error);
			} finally {
				setLoading(false);
			}
		};

		loadConfig();
	}, [id]);

	return (
		<main className="min-h-screen bg-background text-foreground">
			<Header />
			<PageTransition>
				<div className="container mx-auto px-4 py-8">
					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
						<h1 className="text-3xl font-bold mb-6">Configure Agent</h1>
						<p className="text-muted-foreground mb-2">
							Agent ID: <span className="font-mono">{id}</span>
						</p>
						<p className="text-muted-foreground mb-8">Update your agent's configuration parameters.</p>
					</motion.div>

					{loading ? (
						<div className="flex justify-center items-center h-64">
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
								className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
							/>
						</div>
					) : agentConfig ? (
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
							<AgentDeployer initialConfig={agentConfig} isConfiguring={true} agentId={id} />
						</motion.div>
					) : (
						<div className="flex justify-center items-center h-64">
							<p>Failed to load agent configuration. Please try again.</p>
						</div>
					)}
				</div>
			</PageTransition>
		</main>
	);
}
