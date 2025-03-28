"use client";

import React from "react";
import "./globals.css";
import { Inter } from "next/font/google";
import "@suiet/wallet-kit/style.css";
import { WalletProvider } from "@suiet/wallet-kit";
import { Provider as JotaiProvider } from "jotai";
import { EnokiFlowProvider } from "@mysten/enoki/react";
import { SuiClientProvider, createNetworkConfig } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import Header from "@/components/header";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WalletConnectionCheck } from "@/components/wallet-connection-check";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as SonnerToaster } from "@/components/ui/toaster";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: Number.POSITIVE_INFINITY,
		},
	},
});

const inter = Inter({ subsets: ["latin"] });

const { networkConfig } = createNetworkConfig({
	devnet: { url: getFullnodeUrl("devnet") },
	testnet: { url: getFullnodeUrl("testnet") },
	mainnet: { url: getFullnodeUrl("mainnet") },
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="dark">
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>KappaBay - Terminal</title>
			</head>
			<body className={inter.className}>
				<QueryClientProvider client={queryClient}>
					<div
						className="dark antialiased"
						style={{
							colorScheme: "dark",
						}}
					>
						<SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
							<EnokiFlowProvider apiKey={process.env.NEXT_PUBLIC_ENOKI_API_KEY ?? ""}>
								<WalletProvider>
									<JotaiProvider>
										<TooltipProvider delayDuration={0}>
											<SidebarProvider>
												<AppSidebar />
												<SidebarInset>
													<Header />
													<WalletConnectionCheck>
														<div className="flex flex-1 flex-col gap-4 size-full container">{children}</div>
													</WalletConnectionCheck>
												</SidebarInset>
											</SidebarProvider>
											<Toaster />
											<SonnerToaster />
										</TooltipProvider>
									</JotaiProvider>
								</WalletProvider>
							</EnokiFlowProvider>
						</SuiClientProvider>
					</div>
				</QueryClientProvider>
			</body>
		</html>
	);
}
