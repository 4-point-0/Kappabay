// lib/runtimeConfig.ts
let runtimeConfig: any = null;

export async function loadRuntimeConfig() {
	if (typeof window === "undefined") return {};

	if (!runtimeConfig) {
		try {
			const response = await fetch("/api/config");
			const result = await response.json();

			if (!result.success) {
				throw new Error(result.message || "Failed to load config");
			}

			runtimeConfig = result.data;

			// Additional validation if needed
			if (!runtimeConfig?.AGENT_API) {
				throw new Error("AGENT_API is required");
			}
		} catch (error) {
			console.error("Config load error:", error);
			runtimeConfig = {};
			throw error; // Re-throw if you want components to handle errors
		}
	}

	return runtimeConfig;
}
