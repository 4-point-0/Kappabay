"use client";

import { FC } from "react";
/* import {
  AllDefaultWallets,
  defineStashedWallet,
  ,
} from "@suiet/wallet-kit"; */
import React from "react";
import { isEnokiNetwork, registerEnokiWallets } from "@mysten/enoki";
import { useSuiClientContext, createNetworkConfig, SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { useEffect } from "react";
import { getFullnodeUrl, type SuiClientOptions } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { EnokiFlowProvider } from "@mysten/enoki/react";

// Config options for the networks you want to connect to
const { networkConfig } = createNetworkConfig({
	testnet: { url: getFullnodeUrl("testnet") },
});
const queryClient = new QueryClient();
/**
 * Custom provider component for integrating with third-party providers.
 * https://nextjs.org/docs/getting-started/react-essentials#rendering-third-party-context-providers-in-server-components
 * @param props
 * @constructor
 */
function RegisterEnokiWallets() {
  const { client, network } = useSuiClientContext();

  useEffect(() => {
    if (!isEnokiNetwork(network)) return;

    const { unregister } = registerEnokiWallets({
      apiKey: process.env.NEXT_PUBLIC_ENOKI_API_KEY!,
      providers: {
        google: { clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID! },
        // facebook: { clientId: process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID! },
      },
      client,
      network,
    });

    return unregister;
  }, [client, network]);

  return null;
}
	return (
		<EnokiFlowProvider apiKey={process.env.NEXT_PUBLIC_ENOKI_API_KEY ?? ""}>
			<QueryClientProvider client={queryClient}>
				<SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
					<RegisterEnokiWallets />
					<WalletProvider autoConnect={true}>
						{children}
						<Toaster />
					</WalletProvider>
				</SuiClientProvider>
			</QueryClientProvider>
		</EnokiFlowProvider>
	);
};

export default Providers;
