// components/EnvProvider.tsx
"use client";
import { useState, useEffect, createContext, useContext } from "react";
import { loadRuntimeConfig } from "@/lib/runtimeConfig";

type EnvConfig = {
	ENOKI_API_KEY?: string;
	GOOGLE_CLIENT_ID?: string;
	AGENT_API?: string;
};

const EnvContext = createContext<EnvConfig>({});

export function EnvProvider({ children }: { children: React.ReactNode }) {
	const [config, setConfig] = useState<EnvConfig>({});
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadRuntimeConfig()
			.then(setConfig)
			.catch((err) => {
				console.error("Failed to load env:", err);
				setError(err.message);
			});
	}, []);

	if (error) {
		return <div className="p-4 text-red-500">Configuration Error: {error}</div>;
	}

	if (!config.AGENT_API) {
		return <div className="p-4">Loading configuration...</div>;
	}

	return <EnvContext.Provider value={config}>{children}</EnvContext.Provider>;
}

export function useEnv() {
	return useContext(EnvContext);
}
