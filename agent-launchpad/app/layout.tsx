"use client";
import type { Metadata } from "next";
import "./globals.css";
import "@suiet/wallet-kit/style.css";
import { EnokiFlowProvider } from "@mysten/enoki/react";
import { SuiClientProvider, createNetworkConfig } from "@mysten/dapp-kit";
import { WalletProvider } from "@suiet/wallet-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import Providers from "@/app/providers";


const metadata: Metadata = {
	title: "Kappabay",
	description: "Created with love by 4PTO Labs"
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
				
					<Providers>
						{children}	
					</Providers>
				
			</body>
		</html>
	);
}
