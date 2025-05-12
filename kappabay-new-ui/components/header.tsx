"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";
import ConnectButton from "./connect-button";

export default function Header() {
	const [connected, setConnected] = useState(false);
	const pathname = usePathname();

	const handleConnect = () => {
		setConnected(!connected);
	};

	const isActive = (path: string) => {
		return pathname === path;
	};

	return (
		<motion.header
			className="bg-background border-b border-border"
			initial={{ y: -20, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{ duration: 0.3 }}
		>
			<div className="container mx-auto px-4 py-4 flex justify-between items-center">
				<div className="flex items-center">
					<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
						<Link href="/" className="text-2xl font-bold text-foreground">
							Kappabay
						</Link>
					</motion.div>
					<nav className="ml-10 hidden md:flex space-x-6">
						{[
							{ path: "/", label: "Home" },
							{ path: "/deploy", label: "Deploy" },
							{ path: "/marketplace", label: "Marketplace" },
							{ path: "/status", label: "My Agents" },
							{ path: "/kappabay", label: "KappaBae" },
						].map((item) => (
							<motion.div key={item.path} whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
								<Link
									href={item.path}
									className={`text-sm font-medium ${
										isActive(item.path) ? "text-foreground" : "text-muted-foreground hover:text-foreground"
									}`}
								>
									{item.label}
									{isActive(item.path) && <motion.div className="h-0.5 bg-primary mt-0.5" layoutId="underline" />}
								</Link>
							</motion.div>
						))}
					</nav>
				</div>
				<div className="flex items-center space-x-4">
					<ThemeToggle />
					<ConnectButton />
				</div>
			</div>
		</motion.header>
	);
}
