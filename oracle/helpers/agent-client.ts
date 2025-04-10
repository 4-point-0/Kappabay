import { fetcher } from "./fetcher";
import type { UUID, Character } from "@elizaos/core";

export const apiClient = {
	sendMessage: (agentId: string, message: string, walletAddress: string, selectedFile?: File | null, port?: number) => {
		const formData = new FormData();
		formData.append("text", message);
		formData.append("user", "user");
		formData.append("secrets", JSON.stringify({ walletAddress }));
        
		if (selectedFile) {
			formData.append("file", selectedFile);
		}
		return fetcher({
			url: `/${agentId}/message`,
			method: "POST",
			body: formData,
			port: port || 3000,
		});
	},
	getAgents: () => fetcher({ url: "/agents" }),
	getAgent: (agentId: string): Promise<{ id: UUID; character: Character }> => fetcher({ url: `/agents/${agentId}` }),
};