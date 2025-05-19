"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import ConnectButton from "./connect-button";

const LinkUnderlined = ({ text, href }: { text: string; href: string }) => {
	return (
		<Link href={href} className="text-sm font-medium relative group py-1">
			{text}
			<span className="absolute bottom-0 left-0 w-0 h-0.5 bg-success-600 transition-all duration-300 group-hover:w-full"></span>
		</Link>
	);
};

export default function Header({ textColor }: { textColor?: string }) {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const { theme, setTheme } = useTheme();

	const toggleMenu = () => {
		setIsMenuOpen(!isMenuOpen);
	};

	return (
		<header className="py-4 relative z-20">
			<div className="container mx-auto px-4">
				<div className="flex items-center justify-between">
					<Link href="/" className="flex items-center gap-2">
						<div className="w-10 h-10 relative">
							<Image
								src="/KappaBayTransparent.ico"
								alt="KappaBay Logo"
								width={40}
								height={40}
								className="object-contain"
							/>
						</div>
						<span className={`text-xl font-display font-bold ${textColor}`}>KappaBay</span>
					</Link>

					{/* Desktop Navigation */}
					<nav className={`hidden md:flex items-center gap-8 ${textColor} hover:text-gray-800`}>
						<LinkUnderlined text="Home" href="/" />
						<LinkUnderlined text="Deploy" href="/deploy" />
						<LinkUnderlined text="Marketplace" href="/marketplace" />
						<LinkUnderlined text="My Agents" href="/status" />
						<LinkUnderlined text="Kappabae" href="/kappabae" />
					</nav>

					<div className="hidden md:flex items-center gap-4">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
							className="rounded-full"
						>
							<Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
							<Moon
								className={`absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 ${textColor} dark:hover-bg-transparent`}
							/>
							<span className="sr-only">Toggle theme</span>
						</Button>
						<ConnectButton />
					</div>

					{/* Mobile Menu Button */}
					<div className="flex md:hidden items-center gap-2">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
							className="rounded-full"
						>
							<Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 " />
							<Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 dark:bg-" />
							<span className="sr-only">Toggle theme</span>
						</Button>
						<Button variant="ghost" size="icon" onClick={toggleMenu}>
							{isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
						</Button>
					</div>
				</div>

				{/* Mobile Navigation */}
				{isMenuOpen && (
					<div className="md:hidden absolute left-0 right-0 top-full bg-gradient-start p-4 shadow-lg z-50">
						<nav className="flex flex-col gap-4">
							<Link href="/" className="text-sm font-medium hover:text-white/80">
								Home
							</Link>
							<Link href="/deploy" className="text-sm font-medium hover:text-white/80">
								Deploy
							</Link>
							<Link href="/marketplace" className="text-sm font-medium hover:text-white/80">
								Marketplace
							</Link>
							<Link href="/status" className="text-sm font-medium hover:text-white/80">
								My Agents
							</Link>
							<Link href="/kappabae" className="text-sm font-medium hover:text-white/80">
								Kappabae
							</Link>
							<ConnectButton />
						</nav>
					</div>
				)}
			</div>
		</header>
	);
}
