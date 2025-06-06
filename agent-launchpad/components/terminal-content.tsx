"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/header";
import { getAgentInfo } from "@/lib/actions/get-agent-info";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { PageTransition } from "@/components/page-transition";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "@/lib/api";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Message {
	id: string;
	role: "user" | "agent";
	content: string;
	timestamp: Date;
	isLoading?: boolean;
	user?: string;
	action?: string;
}

export function TerminalContent() {
	const wallet = useCurrentAccount();
	const { id } = useParams() as { id: string };
	const [input, setInput] = useState("");
	const queryClient = useQueryClient();
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const suiClient = useSuiClient();

	// agent info state
	const [baseUrl, setBaseUrl] = useState("");

	const [containerAgentId, setContainerAgentId] = useState("");
	const [agentObjectId, setAgentObjectId] = useState("");
	const [agentImage, setAgentImage] = useState<string | null>(null);

	// bootstrap message list
	useEffect(() => {
		if (!queryClient.getQueryData<Message[]>(["messages", id])) {
			queryClient.setQueryData<Message[]>(
				["messages", id],
				[
					{
						id: "1",
						role: "agent",
						content: "Hello! I'm your AI agent. How can I assist you today?",
						timestamp: new Date(),
					},
				]
			);
		}
	}, [id, queryClient]);

	// load port & containerAgentId
	useEffect(() => {
		(async () => {
			const info = await getAgentInfo(id);
			// use the discovered tunnel or fall back to direct localhost
			const _base = info?.publicAgentUrl ?? `http://localhost:${info?.port}`;
			setBaseUrl(_base);

			try {
				const resp = await apiClient.getAgents(_base);
				const first = resp.agents?.[0];

				if (first?.id) setContainerAgentId(first.id);
				if (info?.objectId) setAgentObjectId(info.objectId);
			} catch (e) {
				console.error("getAgents failed", e);
			}
		})();
	}, [id]);

	// Fetch agent image
	useEffect(() => {
		const fetchAgentImage = async () => {
			if (!containerAgentId) return;
			console.log("agentObjectId", agentObjectId);

			try {
				const obj = await suiClient.getObject({
					id: agentObjectId,
					options: { showContent: true },
				});

				const fields = (obj.data?.content as any)?.fields;

				if (fields?.image) {
					setAgentImage(fields.image);
				}
			} catch (error) {
				console.error("Failed to fetch agent image:", error);
			}
		};

		if (containerAgentId) {
			fetchAgentImage();
		}
	}, [containerAgentId]);

	// mutation to send message
	const sendMessage = useMutation({
		mutationKey: ["send_message", id],
		mutationFn: async (msg: string) => {
			if (!containerAgentId || !baseUrl || !wallet?.address) {
				throw new Error("init incomplete");
			}
			return apiClient.sendMessage(containerAgentId, msg, wallet.address, baseUrl, null);
		},
		onSuccess(response) {
			if (Array.isArray(response)) {
				queryClient.setQueryData<Message[]>(["messages", id], (old: Message[] = []) => [
					...old.filter((m) => !m.isLoading),
					...response.map((msg) => ({
						id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
						role: "agent" as const,
						content: msg.text,
						timestamp: new Date(),
						user: msg.user,
						action: msg.action,
					})),
				]);
			} else {
				console.error("bad response", response);
				queryClient.setQueryData<Message[]>(["messages", id], (old: Message[] = []) => old.filter((m) => !m.isLoading));
			}
		},
		onError() {
			queryClient.setQueryData<Message[]>(["messages", id], (old: Message[] = []) => old.filter((m) => !m.isLoading));
		},
	});

	const handleSend = () => {
		if (!input.trim()) return;
		queryClient.setQueryData<Message[]>(["messages", id], (old: Message[] = []) => [
			...old,
			{ id: "u" + Date.now(), role: "user", content: input.trim(), timestamp: new Date() },
			{ id: "l" + Date.now(), role: "agent", content: "Thinking...", timestamp: new Date(), isLoading: true },
		]);
		const txt = input.trim();
		setInput("");
		sendMessage.mutate(txt);
	};

	const messages = queryClient.getQueryData<Message[]>(["messages", id]) || [];

	return (
		<main className="min-h-screen bg-background text-foreground flex flex-col">
			<Header />
			<PageTransition>
				<div className="container mx-auto px-4 py-4 flex-1 flex flex-col">
					<div className="flex items-center mb-4">
						<motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
							<Link href="/status">
								<Button variant="ghost" size="icon">
									<ArrowLeft className="h-4 w-4" />
								</Button>
							</Link>
						</motion.div>
						<h1 className="text-2xl font-bold ml-2">Terminal: {id.slice(0, 6)}</h1>
						<Badge variant="outline" className="ml-4">
							active
						</Badge>
						{baseUrl && (
							<>
								Public Api link:{" "}
								<a
									href={baseUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="ml-4 text-sm text-primary underline"
								>
									{baseUrl}
								</a>
							</>
						)}
					</div>

					<Card className="flex-1 flex flex-col">
						<CardHeader className="pb-2">
							<CardTitle className="text-lg">Chat with your agent</CardTitle>
						</CardHeader>
						{agentImage && (
							<motion.div
								initial={{ opacity: 0, y: -20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5 }}
								className="px-6 pb-2 flex items-center"
							>
								<div className="relative mr-3">
									<div className="relative overflow-hidden rounded-lg h-16 w-16 border-2 border-primary/20 shadow-lg">
										<img
											src={agentImage || "/placeholder.svg"}
											alt="Agent Profile"
											className="h-full w-full object-cover transition-all duration-500 hover:scale-110"
										/>
										<div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
									</div>
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{ delay: 0.3 }}
										className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background"
									/>
								</div>
								<div>
									<h3 className="text-sm font-medium">Agent {containerAgentId.slice(0, 8)}</h3>
									<p className="text-xs text-muted-foreground">Online and ready</p>
								</div>
							</motion.div>
						)}
						<CardContent className="flex-1 overflow-y-auto p-4">
							<AnimatePresence>
								<div className="space-y-4">
									{messages.map((m) => (
										<motion.div
											key={m.id}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -10 }}
											transition={{ duration: 0.3 }}
											className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
										>
											<div
												className={`flex max-w-[80%] ${
													m.role === "user" ? "flex-row-reverse" : "flex-row"
												} items-start gap-2`}
											>
												{m.role === "agent" && (
													<div className="relative">
														<Avatar
															className={`mr-2 ${
																agentImage ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
															}`}
														>
															<AvatarFallback>A</AvatarFallback>
															<AvatarImage
																src={agentImage || "/placeholder.svg?height=40&width=40"}
																alt="Agent"
																className="object-cover transition-all duration-300 hover:scale-105"
															/>
														</Avatar>
														{agentImage && (
															<motion.div
																initial={{ opacity: 0, scale: 0 }}
																animate={{ opacity: 1, scale: 1 }}
																className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500"
															/>
														)}
													</div>
												)}
												{m.role === "user" && (
													<Avatar className={m.role === "user" ? "ml-2" : "mr-2"}>
														<AvatarFallback>{m.role === "user" ? "U" : "A"}</AvatarFallback>
													</Avatar>
												)}
												<motion.div
													initial={{ scale: 0.9 }}
													animate={{ scale: 1 }}
													className={`rounded-md p-3 ${
														m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
													}`}
												>
													{m.isLoading ? (
														<>
															<p>{m.content}</p>
															<Loader2 className="ml-2 h-4 w-4 animate-spin" />
														</>
													) : (
														<p>{m.content}</p>
													)}
													<div className="flex justify-between items-center mt-1">
														<p className="text-xs opacity-70">
															{m.timestamp.toLocaleTimeString([], {
																hour: "2-digit",
																minute: "2-digit",
															})}
														</p>
														{m.action && m.action !== "NONE" && (
															<Badge variant="outline" className="text-xs">
																{m.action}
															</Badge>
														)}
													</div>
												</motion.div>
											</div>
										</motion.div>
									))}
									<div ref={messagesEndRef} />
								</div>
							</AnimatePresence>
						</CardContent>
						<CardFooter className="p-4 pt-2">
							<div className="flex w-full items-center space-x-2">
								<Input
									type="text"
									placeholder="Type your message..."
									value={input}
									onChange={(e) => setInput(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
									className="flex-1"
									disabled={sendMessage.isPending}
								/>
								<motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
									<Button size="icon" onClick={handleSend} disabled={sendMessage.isPending}>
										{sendMessage.isPending ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Send className="h-4 w-4" />
										)}
									</Button>
								</motion.div>
							</div>
						</CardFooter>
					</Card>
				</div>
			</PageTransition>
		</main>
	);
}
