"use client";
import type { Metadata } from "next";
import "./globals.css";
import "@suiet/wallet-kit/style.css";
import { EnokiFlowProvider } from "@mysten/enoki/react";
import { SuiClientProvider, createNetworkConfig } from "@mysten/dapp-kit";
import { WalletProvider } from "@suiet/wallet-kit";
import { getFullnodeUrl } from "@mysten/sui/client";

const metadata: Metadata = {
	title: "v0 App",
	description: "Created with v0",
	generator: "v0.dev",
};

const { networkConfig } = createNetworkConfig({
	devnet: { url: getFullnodeUrl("devnet") },
	testnet: { url: getFullnodeUrl("testnet") },
	mainnet: { url: getFullnodeUrl("mainnet") },
});

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body>
				<SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
					<EnokiFlowProvider apiKey={process.env.NEXT_PUBLIC_ENOKI_API_KEY ?? ""}>
						<WalletProvider>{children}</WalletProvider>
					</EnokiFlowProvider>
				</SuiClientProvider>
			</body>
		</html>
	);
}
