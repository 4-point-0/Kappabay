import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Providers from "./providers";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

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
			<body className={inter.className}>
				<Providers>
					<ThemeProvider>
						{children}
						<Toaster />
					</ThemeProvider>
				</Providers>
			</body>
		</html>
	);
}
