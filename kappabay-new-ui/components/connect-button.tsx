"use client";
import { useCurrentAccount, useDisconnectWallet, ConnectModal, useConnectWallet, useWallets } from "@mysten/dapp-kit";
import { useCallback, useEffect, useState, useRef } from "react";
import { resolveSuinsName } from "@/lib/suins";
import { motion, AnimatePresence } from "framer-motion";
import { isEnokiWallet } from "@mysten/enoki";
import { Root, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar";
import Link from "next/link";
import { Button } from "./ui/button";

import "@mysten/dapp-kit/dist/index.css";

// In Next.js, for client-side environment variables, use NEXT_PUBLIC_ prefix
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

const ConnectButton = () => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [showConnectOptions, setShowConnectOptions] = useState(false);
	const account = useCurrentAccount();
	const { mutate: disconnect } = useDisconnectWallet();
	const [suinsName, setSuinsName] = useState<string | null>(null);
	const walletAddress = account?.address;
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const fetchSuinsName = async () => {
			if (!walletAddress) return;

			try {
				const name = await resolveSuinsName(walletAddress);
				setSuinsName(name);
			} catch (error) {
				console.error("Failed to fetch SuiNS name:", error);
				setSuinsName(null);
			}
		};

		fetchSuinsName();
	}, [walletAddress]);

	const { mutate: connect } = useConnectWallet();
	const enokiWallets = useWallets().filter(isEnokiWallet);
	const walletsByProvider = enokiWallets.reduce((map, wallet) => {
		map.set(wallet.provider, wallet);
		return map;
	}, new Map());

	const googleWallet = walletsByProvider.get("google");
	const facebookWallet = walletsByProvider.get("facebook");

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setIsMenuOpen(false);
			}
		};

		if (isMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isMenuOpen]);

	if (account) {
		return (
			<div className="relative h-full flex items-center gap-2">
				{suinsName && (
					<div className="hidden sm:block text-lg font-medium text-gray-700 dark:text-gray-300">{suinsName}</div>
				)}
				<motion.button
					className="w-10 h-10 rounded-full overflow-hidden border-2 border-white focus:outline-none"
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => setIsMenuOpen(!isMenuOpen)}
				>
					<Root>
						<AvatarImage src="/KappaBayTransparent.ico" alt="User Avatar" width={40} height={40} />
						<AvatarFallback>KB</AvatarFallback>
					</Root>
				</motion.button>
				<AnimatePresence>
					{isMenuOpen && (
						<motion.div
							ref={menuRef}
							className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10"
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
						>
							<Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
								Settings
							</Link>
							<button
								onClick={() => disconnect()}
								className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
							>
								Log out
							</button>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* dapp-kit Login (default Connect Modal) */}
			<div className="relative">
				<motion.button
					className="bg-primary text-white py-2 px-4 rounded h-full"
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => setShowConnectOptions(true)}
				>
					Connect with Wallet
				</motion.button>

				<AnimatePresence>
					{showConnectOptions && (
						<motion.div
							className="absolute right-0 mt-2 w-64 bg-card rounded-lg shadow-lg p-6 flex flex-col space-y-4 z-20"
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
						>
							<h2 className="text-xl font-semibold mb-4">Connect Wallet</h2>
							<ConnectModal trigger={<Button>Connect with Wallet</Button>} />
							<motion.button
								className="mt-4 hover:text-gray-400"
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => setShowConnectOptions(false)}
							>
								Cancel
							</motion.button>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
};

export default ConnectButton;
