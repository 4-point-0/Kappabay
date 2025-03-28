"use client";
import { useWallet } from "@suiet/wallet-kit";
import { useZkLogin } from "@mysten/enoki/react";
import { Wallet } from "lucide-react";
import { usePathname } from "next/navigation";

interface WalletConnectionCheckProps {
	children: React.ReactNode;
}

export function WalletConnectionCheck({ children }: WalletConnectionCheckProps) {
	const { connected: suietConnected } = useWallet();
	const { address } = useZkLogin();
	const pathname = usePathname();
	const isConnected = suietConnected || address;

	if (pathname === '/auth' || isConnected) {
		return <>{children}</>;
	}

	return (
		<div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4 text-center">
			<div className="max-w-md space-y-6">
				<div className="flex justify-center">
					<div className="p-6 rounded-full bg-primary/10">
						<Wallet className="w-12 h-12 text-primary" />
					</div>
				</div>
				<h1 className="text-2xl font-bold">Connect Your Wallet</h1>
				<p className="text-muted-foreground">
					Please connect your wallet to access the KappaBay Terminal App. You can connect using Suiet wallet or Enoki.
				</p>
			</div>
		</div>
	);
}
