import { NextResponse } from "next/server";
import { retrieveDb } from "@/app/actions/retrieve-db";
import { z } from "zod";

// Define a validation schema using Zod
const schema = z.object({
	agentId: z.string().min(1, "agentId is required"),
});

export async function POST(req: Request) {
	let body: { agentId: string };
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ success: false, message: "Invalid JSON format." }, { status: 400 });
	}

	const parseResult = schema.safeParse(body);
	if (!parseResult.success) {
		const errorMessage = parseResult.error.errors[0].message;
		return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
	}

	const { agentId } = parseResult.data;

	try {
		const result = await retrieveDb(agentId);
		return NextResponse.json({ success: true, data: result }, { status: 200 });
	} catch (error: any) {
		console.error("Error in retrieveDb API:", error);
		return NextResponse.json({ success: false, message: error.message || "Internal Server Error." }, { status: 500 });
	}
}

// Handle CORS Preflight Requests (Optional)
export async function OPTIONS(req: Request) {
	return NextResponse.json({}, { status: 200 });
}
