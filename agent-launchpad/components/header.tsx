"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import ConnectButton from "./connect-button";

export default function Header() {
	const [connected, setConnected] = useState(false);

	const handleConnect = () => {
		setConnected(!connected);
	};

	return (
		<header className="bg-white border-b border-gray-200">
			<div className="container mx-auto px-4 py-4 flex justify-between items-center">
				<div className="flex items-center">
					<h1 className="text-2xl font-bold text-gray-900">Kappabay</h1>
				</div>
				{/* <Button onClick={handleConnect} variant={connected ? "outline" : "default"} className="ml-auto"> */}
				{/* {connected ? "Wallet Connected" : "Connect Wallet"} */}
				{/* </Button> */}
				<ConnectButton />
			</div>
		</header>
	);
}
