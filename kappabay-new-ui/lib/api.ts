import type { UUID, Character } from "@elizaos/core";

const fetcher = async ({
	baseUrl,
	url,
	method,
	body,
	headers,
}: {
	baseUrl: string;
	url: string;
	method?: "GET" | "POST";
	body?: object | FormData;
	headers?: HeadersInit;
}) => {
	const options: RequestInit = {
		method: method ?? "GET",
		headers: headers
			? headers
			: {
					Accept: "application/json",
					"Content-Type": "application/json",
					"ngrok-skip-browser-warning": "1",
			  },
	};

	if (method === "POST") {
		if (body instanceof FormData) {
			if (options.headers && typeof options.headers === "object") {
				// Create new headers object without Content-Type
				options.headers = Object.fromEntries(
					Object.entries(options.headers as Record<string, string>).filter(([key]) => key !== "Content-Type")
				);
			}
			options.body = body;
		} else {
			options.body = JSON.stringify(body);
		}
	}

	return fetch(`${baseUrl}${url}`, options).then(async (resp) => {
		const contentType = resp.headers.get("Content-Type");
		if (contentType === "audio/mpeg") {
			return await resp.blob();
		}

		if (!resp.ok) {
			const errorText = await resp.text();
			console.error("Error: ", errorText);

			let errorMessage = "An error occurred.";
			try {
				const errorObj = JSON.parse(errorText);
				errorMessage = errorObj.message || errorMessage;
			} catch {
				errorMessage = errorText || errorMessage;
			}

			throw new Error(errorMessage);
		}

		return resp.json();
	});
};

export const apiClient = {
	sendMessage: (
		agentId: string,
		message: string,
		walletAddress: string,
		baseUrl: string,
		selectedFile?: File | null
	) => {
		const formData = new FormData();
		formData.append("text", message);
		formData.append("user", "user");
		formData.append("secrets", JSON.stringify({ walletAddress }));

		if (selectedFile) {
			formData.append("file", selectedFile);
		}
		return fetcher({
			baseUrl,
			url: `/${agentId}/message`,
			method: "POST",
			body: formData,
		});
	},
	getAgents: (baseUrl: string) => fetcher({ baseUrl, url: "/agents" }),
	getAgent: (agentId: string, baseUrl: string): Promise<{ id: UUID; character: Character }> =>
		fetcher({ baseUrl, url: `/agents/${agentId}` }),
	tts: (agentId: string, text: string, baseUrl: string) =>
		fetcher({
			baseUrl,
			url: `/${agentId}/tts`,
			method: "POST",
			body: { text },
			headers: {
				"Content-Type": "application/json",
				Accept: "audio/mpeg",
				"Transfer-Encoding": "chunked",
			},
		}),
	whisper: async (agentId: string, audioBlob: Blob, baseUrl: string) => {
		const formData = new FormData();
		formData.append("file", audioBlob, "recording.wav");
		return fetcher({
			baseUrl,
			url: `/${agentId}/whisper`,
			method: "POST",
			body: formData,
		});
	},
};
