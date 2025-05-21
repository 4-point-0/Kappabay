import type React from "react";
import type { Metadata } from "next";
import { Inter, Funnel_Display } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import BackgroundMountains from "@/components/BackgroundMountains";

const inter = Inter({ subsets: ["latin"] });
const funnel = Funnel_Display({ subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
	title: "Kappabay - AI Agent Marketplace",
	description: "A decentralized marketplace for AI Agent capabilities and data feeds built on SUI",
	generator: "v0.dev",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${inter.className} ${funnel.className}`}>
				<Providers>{children}</Providers>
				<BackgroundMountains />
			</body>
		</html>
	);
}
