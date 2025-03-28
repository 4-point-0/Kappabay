"use client";
import Link from "next/link"; // Import Link from next/link
import ConnectButton from "./connect-button";

export default function Header() {
	return (
		<header className="fixed top-0 left-0 right-0 z-50 bg-card backdrop-blur-md h-16">
			<nav className="container mx-0 px-6 h-full flex justify-between items-center max-w-full">
				<Link href={"/"} className="text-2xl font-bold flex items-center h-full">
					KappaBay Terminal App
				</Link>
				<div className="flex items-center h-10 gap-2">
					<ConnectButton />
				</div>
			</nav>
		</header>
	);
}
