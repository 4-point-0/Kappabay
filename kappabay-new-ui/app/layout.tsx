import type React from "react";
import type { Metadata } from "next";
import { Inter, Funnel_Display } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Image from "next/image";

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
				<div className="absolute top-[50vh] left-0 right-0 z-0">
					<Image
						src="/mountains-background.png"
						alt="Mountain Landscape"
						width={1920}
						height={600}
						className="w-full h-auto"
						priority
					/>
				</div>
			</body>
		</html>
	);
}
