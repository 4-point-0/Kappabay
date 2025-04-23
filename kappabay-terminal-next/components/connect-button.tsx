"use client";
import { ConnectModal, useWallet } from "@suiet/wallet-kit";
import { useCallback, useEffect, useState, useRef } from "react";
import { resolveSuinsName } from "@/lib/suins";
import { motion, AnimatePresence } from "framer-motion";
import { useEnokiFlow, useZkLoginSession } from "@mysten/enoki/react";
import { Root, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar";
import Link from "next/link"; // Import Link from next/link
import { useEnv } from "./env-provider";

const ConnectButton = () => {
	const { GOOGLE_CLIENT_ID } = useEnv();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [showConnectOptions, setShowConnectOptions] = useState(false);
	const [connectMethod, setConnectMethod] = useState<"enoki" | "walletKit" | null>(null);
	const [walletName, setWalletName] = useState<string | null>(null);
	const [isAuthSuccess, setIsAuthSuccess] = useState<boolean | undefined>(undefined);

	const { connected, account, disconnect } = useWallet();
	const zkSession = useZkLoginSession();
	const enokiFlow = useEnokiFlow();
	const [suinsName, setSuinsName] = useState<string | null>(null);
	// const walletAddress = connected ? account?.address : zkSession?.address;
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

	useEffect(() => {
		setIsAuthSuccess(connected || zkSession?.jwt ? true : undefined);
	}, [connected, account, walletName, zkSession?.jwt]);

	useEffect(() => {
		if (isAuthSuccess === false) {
			setShowConnectOptions(false);
			setIsMenuOpen(false);
			if (connected) {
				disconnect();
			}
			if (zkSession?.jwt) {
				enokiFlow.logout();
			}
		}
	}, [isAuthSuccess, connected, disconnect, zkSession?.jwt, enokiFlow]);

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

	const handleEnokiConnection = useCallback(() => {
		const protocol = window.location.protocol;
		const host = window.location.host;
		const redirectUrl = `${protocol}//${host}/auth`;
		enokiFlow
			.createAuthorizationURL({
				provider: "google",
				network: "testnet",
				clientId: GOOGLE_CLIENT_ID!,
				redirectUrl,
				extraParams: {
					scope: ["openid", "email", "profile"],
				},
			})
			.then((url) => {
				window.location.href = url;
			})
			.catch((error) => {
				console.error("Enoki Connection Error:", error);
			});
	}, [enokiFlow]);

	const handleWalletKitConnection = () => {
		setShowConnectOptions(false);
		setConnectMethod("walletKit");
		setShowConnectOptions(true);
	};

	return (
		<>
			{(connected || zkSession?.jwt) && isAuthSuccess ? (
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
									onClick={() => setIsAuthSuccess(false)}
									className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
								>
									Log out
								</button>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			) : (
				<div className="relative">
					<motion.button
						className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded h-full"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={() => setShowConnectOptions(true)}
					>
						Connect
					</motion.button>

					<AnimatePresence>
						{showConnectOptions && (
							<motion.div
								className="absolute right-0 mt-2 w-64 bg-card rounded-lg shadow-lg p-6 flex flex-col space-y-4 z-20"
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -10 }}
							>
								<h2 className="text-xl font-semibold mb-4">Choose Connection Method</h2>
								<motion.button
									className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									onClick={handleEnokiConnection}
								>
									Connect with Enoki
								</motion.button>
								<motion.button
									className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									onClick={handleWalletKitConnection}
								>
									Connect with Wallet Kit
								</motion.button>
								<motion.button
									className="mt-4 text-gray-100 hover:text-gray-400"
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									onClick={() => setShowConnectOptions(false)}
								>
									Cancel
								</motion.button>
							</motion.div>
						)}
					</AnimatePresence>

					<ConnectModal
						className="bg-wkit-bg text-wkit-onBg"
						open={connectMethod === "walletKit"}
						onOpenChange={(open) => {
							if (!open) {
								setShowConnectOptions(false);
								setConnectMethod(null);
							}
						}}
						onConnectSuccess={(walletName) => {
							console.log("onConnectSuccess", walletName);
							setWalletName(walletName);
							setConnectMethod(null);
						}}
						onConnectError={(error) => {
							console.error("Connection Error:", error);
							setConnectMethod(null);
						}}
					/>
				</div>
			)}
		</>
	);
};

export default ConnectButton;
