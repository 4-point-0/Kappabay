// app/api/config/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

// Schema for validation (optional)
const envSchema = z.object({
	ENOKI_API_KEY: z.string().min(1),
	GOOGLE_CLIENT_ID: z.string().min(1),
	AGENT_API: z.string().url(),
});

export async function GET() {
	try {
		const env = {
			ENOKI_API_KEY: process.env.ENOKI_API_KEY,
			GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
			AGENT_API: process.env.AGENT_API,
		};

		// Optional validation
		const parseResult = envSchema.safeParse(env);
		if (!parseResult.success) {
			console.error("Environment validation failed:", parseResult.error);
			return NextResponse.json({ success: false, message: "Server misconfigured" }, { status: 500 });
		}

		return NextResponse.json({ success: true, data: parseResult.data }, { status: 200 });
	} catch (error: any) {
		console.error("Config endpoint error:", error);
		return NextResponse.json({ success: false, message: error.message || "Internal Server Error" }, { status: 500 });
	}
}

// For CORS preflight
export async function OPTIONS() {
	return NextResponse.json({}, { status: 200 });
}
