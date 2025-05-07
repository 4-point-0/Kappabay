"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { AgentConfig } from "@/lib/types";

interface Plugin {
	id: string;
	name: string;
	description: string;
	category: string;
	enabled: boolean;
	alwaysEnabled?: boolean;
	hasSettings?: boolean;
}

interface PluginSelectorProps {
	onPluginChange?: (plugins: string[]) => void;
	onEnvChange?: (env: Record<string, string>) => void;
	agentConfig?: AgentConfig;
}

export default function PluginSelector({ onPluginChange, onEnvChange, agentConfig }: PluginSelectorProps) {
	const [plugins, setPlugins] = useState<Plugin[]>([
		{
			id: "sui",
			name: "SUI Plugin",
			description: "Interact with the SUI blockchain and smart contracts",
			category: "Blockchain",
			enabled: true,
			alwaysEnabled: true,
		},
		{
			id: "walrus",
			name: "Walrus Memory Banks",
			description: "Wallet integration and transaction management",
			category: "Blockchain",
			enabled: true,
			alwaysEnabled: true,
		},
		{
			id: "twitter",
			name: "Twitter Integration",
			description: "Connect with Twitter for social media interactions",
			category: "Social",
			enabled: false,
			hasSettings: true,
		},
		{
			id: "telegram",
			name: "Telegram Integration",
			description: "Connect with Telegram for messaging capabilities",
			category: "Social",
			enabled: false,
			hasSettings: true,
		},
		{
			id: "discord",
			name: "Discord Integration",
			description: "Connect with Discord for community interactions",
			category: "Social",
			enabled: false,
			hasSettings: true,
		},
	]);

	const [settingsOpen, setSettingsOpen] = useState(false);
	const [currentPlugin, setCurrentPlugin] = useState<Plugin | null>(null);
	const [env, setEnv] = useState<Record<string, string>>({});

	// Initialize plugins and env from agentConfig if provided
	useEffect(() => {
		if (agentConfig) {
			// Initialize enabled plugins
			if (agentConfig.plugins && agentConfig.plugins.length > 0) {
				const updatedPlugins = plugins.map((plugin) => ({
					...plugin,
					enabled: plugin.alwaysEnabled || agentConfig.plugins.includes(plugin.id),
				}));
				setPlugins(updatedPlugins);
			}

			// Initialize env variables
			if (agentConfig.env) {
				setEnv(agentConfig.env);
			}
		}
	}, [agentConfig]);

	const handleTogglePlugin = (id: string, enabled: boolean) => {
		const updatedPlugins = plugins.map((plugin) => (plugin.id === id ? { ...plugin, enabled } : plugin));
		setPlugins(updatedPlugins);

		// Update parent component with enabled plugin IDs
		if (onPluginChange) {
			const enabledPluginIds = updatedPlugins.filter((plugin) => plugin.enabled).map((plugin) => plugin.id);
			onPluginChange(enabledPluginIds);
		}
	};

	const openSettings = (plugin: Plugin) => {
		setCurrentPlugin(plugin);
		setSettingsOpen(true);
	};

	const handleEnvChange = (key: string, value: string) => {
		const updatedEnv = { ...env, [key]: value };
		setEnv(updatedEnv);

		if (onEnvChange) {
			onEnvChange(updatedEnv);
		}
	};

	const saveSettings = () => {
		setSettingsOpen(false);
	};

	// Get the settings fields based on the current plugin
	const getSettingsFields = () => {
		if (!currentPlugin) return null;

		switch (currentPlugin.id) {
			case "twitter":
				return (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="TWITTER_API_KEY">API Key</Label>
							<Input
								id="TWITTER_API_KEY"
								value={env.TWITTER_API_KEY || ""}
								onChange={(e) => handleEnvChange("TWITTER_API_KEY", e.target.value)}
								placeholder="your_twitter_api_key_here"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="TWITTER_API_SECRET">API Secret</Label>
							<Input
								id="TWITTER_API_SECRET"
								value={env.TWITTER_API_SECRET || ""}
								onChange={(e) => handleEnvChange("TWITTER_API_SECRET", e.target.value)}
								placeholder="your_twitter_api_secret_here"
								type="password"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="TWITTER_ACCESS_TOKEN">Access Token</Label>
							<Input
								id="TWITTER_ACCESS_TOKEN"
								value={env.TWITTER_ACCESS_TOKEN || ""}
								onChange={(e) => handleEnvChange("TWITTER_ACCESS_TOKEN", e.target.value)}
								placeholder="your_twitter_access_token_here"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="TWITTER_ACCESS_TOKEN_SECRET">Access Token Secret</Label>
							<Input
								id="TWITTER_ACCESS_TOKEN_SECRET"
								value={env.TWITTER_ACCESS_TOKEN_SECRET || ""}
								onChange={(e) => handleEnvChange("TWITTER_ACCESS_TOKEN_SECRET", e.target.value)}
								placeholder="your_twitter_access_token_secret_here"
								type="password"
							/>
						</div>
					</div>
				);
			case "discord":
				return (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="DISCORD_BOT_TOKEN">Bot Token</Label>
							<Input
								id="DISCORD_BOT_TOKEN"
								value={env.DISCORD_BOT_TOKEN || ""}
								onChange={(e) => handleEnvChange("DISCORD_BOT_TOKEN", e.target.value)}
								placeholder="your_discord_bot_token_here"
								type="password"
							/>
						</div>
					</div>
				);
			case "telegram":
				return (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="TELEGRAM_BOT_TOKEN">Bot Token</Label>
							<Input
								id="TELEGRAM_BOT_TOKEN"
								value={env.TELEGRAM_BOT_TOKEN || ""}
								onChange={(e) => handleEnvChange("TELEGRAM_BOT_TOKEN", e.target.value)}
								placeholder="your_telegram_bot_token_here"
								type="password"
							/>
						</div>
					</div>
				);
			default:
				return null;
		}
	};

	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-lg font-medium mb-2">Available Integrations</h3>
				<p className="text-sm text-muted-foreground mb-4">Select integrations to enhance your agent's capabilities</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{plugins.map((plugin) => (
					<Card key={plugin.id} className="border-2 border-dashed">
						<CardHeader className="pb-2">
							<div className="flex justify-between items-start">
								<div>
									<CardTitle className="text-md">{plugin.name}</CardTitle>
									<CardDescription>{plugin.description}</CardDescription>
								</div>
								<Badge variant="outline">{plugin.category}</Badge>
							</div>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-between">
								<div className="flex items-center space-x-2">
									<Checkbox
										id={`plugin-${plugin.id}`}
										checked={plugin.enabled}
										disabled={plugin.alwaysEnabled}
										onCheckedChange={(checked) => handleTogglePlugin(plugin.id, checked === true)}
									/>
									<Label
										htmlFor={`plugin-${plugin.id}`}
										className={plugin.alwaysEnabled ? "text-muted-foreground" : ""}
									>
										{plugin.alwaysEnabled ? "Always enabled" : "Enable integration"}
									</Label>
								</div>
								{plugin.hasSettings && (
									<Button variant="ghost" size="icon" onClick={() => openSettings(plugin)} disabled={!plugin.enabled}>
										<Settings className="h-4 w-4" />
										<span className="sr-only">Settings</span>
									</Button>
								)}
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>{currentPlugin?.name} Settings</DialogTitle>
						<DialogDescription>Configure the integration settings for {currentPlugin?.name}.</DialogDescription>
					</DialogHeader>
					<div className="py-4">{getSettingsFields()}</div>
					<DialogFooter>
						<Button onClick={saveSettings}>Save Settings</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
