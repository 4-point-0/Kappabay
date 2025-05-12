"use client";

import type React from "react";

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
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Update the Message interface to include user and action properties
interface Message {
	id: string;
	role: "user" | "agent";
	content: string;
	timestamp: Date;
	isLoading?: boolean;
	user?: string;
	action?: string;
}

export default function TerminalPage() {
	const wallet = useCurrentAccount();
	const params = useParams();
	const id = params.id as string;
	const [input, setInput] = useState("");
	const queryClient = useQueryClient();
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// NEW: BaseUrl and containerAgentId state variables
	const [baseUrl, setBaseUrl] = useState<string>("");
	const [containerAgentId, setContainerAgentId] = useState<string>("");

	// Mock agent data
	const agent = {
		id,
		name: "Agent " + id.slice(0, 6),
		status: "active",
		objectId: id,
	};

	// Initialize messages in React Query cache if not already present
	useEffect(() => {
		if (!queryClient.getQueryData(["messages", id])) {
			queryClient.setQueryData(
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

	// NEW: On component mount, retrieve agent port and container agent ID.
	useEffect(() => {
		(async () => {
			// Retrieve agent info from DB using agent.id.
			const agentInfo = await getAgentInfo(agent.id);
			if (!agentInfo || !agentInfo.port) {
				console.error("Unable to retrieve agent port from DB for agent:", agent.id);
				return;
			}

			// Construct base URL from agent port.
			const _baseUrl = agentInfo.ngrokUrl ?? `http://localhost:${agentInfo.port}`;
			setBaseUrl(_baseUrl);

			try {
				// Call apiClient.getAgents with the baseUrl.
				const agentsResponse = await apiClient.getAgents(_baseUrl);
				const agent = agentsResponse?.agents?.[0];
				if (agent?.id) {
					// Use the first agent's id as the containerAgentId.
					setContainerAgentId(agent.id);
				} else {
					console.error("No agents returned from getAgents call.");
				}
			} catch (error) {
				console.error("Error retrieving agents:", error);
			}
		})();
	}, [agent.id]);

	// Send message mutation
	const sendMessageMutation = useMutation({
		mutationKey: ["send_message", id],
		mutationFn: async (messageContent: string) => {
			// Ensure initialization is complete.
			if (!containerAgentId || !baseUrl || !wallet?.address) {
				throw new Error("Agent initialization incomplete or wallet not connected");
			}

			const response = await apiClient.sendMessage(
				containerAgentId, // container agent id from getAgents response
				messageContent, // text message
				wallet.address, // wallet's address
				baseUrl, // dynamic baseUrl (http://localhost:<agent.port>)
				null // no file provided
			);

			return response;
		},
		onSuccess: (response) => {
			// The response is an array of message objects
			if (Array.isArray(response) && response.length > 0) {
				// Add agent responses to messages
				queryClient.setQueryData(["messages", id], (oldMessages: Message[] = []) => [
					...oldMessages.filter((msg) => !msg.isLoading),
					...response.map((msg) => ({
						id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
						role: "agent",
						content: msg.text,
						timestamp: new Date(),
						user: msg.user,
						action: msg.action,
					})),
				]);
			} else {
				console.error("Unexpected response format:", response);
				// Remove loading message on error
				queryClient.setQueryData(["messages", id], (oldMessages: Message[] = []) =>
					oldMessages.filter((msg) => !msg.isLoading)
				);
			}
		},
		onError: (error) => {
			console.error("Error sending message:", error);
			// Remove loading message on error
			queryClient.setQueryData(["messages", id], (oldMessages: Message[] = []) =>
				oldMessages.filter((msg) => !msg.isLoading)
			);
		},
	});

	const handleSendMessage = async () => {
		if (!input.trim()) return;

		// Create and add the user's message and a loading message
		const newMessages: Message[] = [
			{
				id: Date.now().toString(),
				role: "user",
				content: input.trim(),
				timestamp: new Date(),
			},
			{
				id: `loading-${Date.now()}`,
				role: "agent",
				content: "Thinking...",
				timestamp: new Date(),
				isLoading: true,
			},
		];

		// Update messages in React Query cache
		queryClient.setQueryData(["messages", id], (oldMessages: Message[] = []) => [...oldMessages, ...newMessages]);

		// Preserve the message content and clear input
		const messageContent = input.trim();
		setInput("");

		// Send the message
		sendMessageMutation.mutate(messageContent);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [queryClient.getQueryData(["messages", id])]);

	// Get messages from React Query cache
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
						<h1 className="text-2xl font-bold ml-2">Terminal: {agent.name}</h1>
						<Badge variant="outline" className="ml-4">
							{agent.status}
						</Badge>
					</div>

					<Card className="flex-1 flex flex-col">
						<CardHeader className="pb-2">
							<CardTitle className="text-lg">Chat with your agent</CardTitle>
						</CardHeader>
						<CardContent className="flex-1 overflow-y-auto p-4">
							<AnimatePresence>
								<div className="space-y-4">
									{messages.map((message) => (
										<motion.div
											key={message.id}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -10 }}
											transition={{ duration: 0.3 }}
											className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
										>
											<div
												className={`flex max-w-[80%] ${
													message.role === "user" ? "flex-row-reverse" : "flex-row"
												} items-start gap-2`}
											>
												<Avatar className={message.role === "user" ? "ml-2" : "mr-2"}>
													<AvatarFallback>{message.role === "user" ? "U" : "A"}</AvatarFallback>
													{message.role === "agent" && (
														<AvatarImage src="/placeholder.svg?height=40&width=40" alt="Agent" />
													)}
												</Avatar>
												<motion.div
													initial={{ scale: 0.9 }}
													animate={{ scale: 1 }}
													className={`rounded-lg p-3 ${
														message.role === "user"
															? "bg-primary text-primary-foreground"
															: "bg-muted text-muted-foreground"
													}`}
												>
													{message.user && message.role === "agent" && (
														<p className="text-xs font-medium mb-1">{message.user}</p>
													)}
													<div className="flex items-center">
														{message.isLoading ? (
															<>
																<p>{message.content}</p>
																<Loader2 className="ml-2 h-4 w-4 animate-spin" />
															</>
														) : (
															<p>{message.content}</p>
														)}
													</div>
													<div className="flex justify-between items-center mt-1">
														<p className="text-xs opacity-70">
															{message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
														</p>
														{message.action && message.action !== "NONE" && (
															<Badge variant="outline" className="text-xs">
																{message.action}
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
									onKeyDown={handleKeyDown}
									className="flex-1"
									disabled={sendMessageMutation.isPending}
								/>
								<motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
									<Button
										type="submit"
										size="icon"
										onClick={handleSendMessage}
										disabled={sendMessageMutation.isPending}
									>
										{sendMessageMutation.isPending ? (
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
