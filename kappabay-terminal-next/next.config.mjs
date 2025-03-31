let userConfig = undefined;
try {
	userConfig = await import("./v0-user-next.config");
} catch (e) {
	// ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
	productionBrowserSourceMaps: true, // Add this
	eslint: {
		ignoreDuringBuilds: true,
	},
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		unoptimized: true,
	},
	experimental: {
		webpackBuildWorker: true,
		parallelServerBuildTraces: true,
		parallelServerCompiles: true,
		serverActions: {
			// Increase the body size limit to 10MB (adjust as needed)
			bodySizeLimit: "10mb",
			// (Optional) If you're accessing Server Actions from different origins, specify them here
			// allowedOrigins: ['https://your-allowed-origin.com', 'https://another-origin.com'],
		},
	},
};

mergeConfig(nextConfig, userConfig);

function mergeConfig(nextConfig, userConfig) {
	if (!userConfig) {
		return;
	}

	for (const key in userConfig) {
		if (typeof nextConfig[key] === "object" && !Array.isArray(nextConfig[key])) {
			nextConfig[key] = {
				...nextConfig[key],
				...userConfig[key],
			};
		} else {
			nextConfig[key] = userConfig[key];
		}
	}
}

export default nextConfig;
