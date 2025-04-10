import { CONFIG } from "../config";

export const fetcher = async ({
  url,
  method,
  body,
  headers,
  port,
}: {
  url: string;
  method?: "GET" | "POST";
  body?: object | FormData;
  headers?: HeadersInit;
  port?: number;
}) => {
  const options: RequestInit = {
    method: method ?? "GET",
    headers: headers
      ? headers
      : {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
  };

  if (method === "POST") {
    if (body instanceof FormData) {
      if (options.headers && typeof options.headers === "object") {
        // Create new headers object without Content-Type
        options.headers = Object.fromEntries(
          Object.entries(options.headers as Record<string, string>).filter(
            ([key]) => key !== "Content-Type"
          )
        );
      }
      options.body = body;
    } else {
      options.body = JSON.stringify(body);
    }
  }

  return fetch(`${CONFIG.BASE_URL}:${port || 3000}${url}`, options).then(
    async (resp) => {
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
    }
  );
};
