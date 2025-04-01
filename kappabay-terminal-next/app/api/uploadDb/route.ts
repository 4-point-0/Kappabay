import { NextResponse } from "next/server";
import { uploadDb } from "@/app/actions/upload-db";
import { z } from "zod";

// Define a validation schema using Zod
const schema = z.object({
	agentId: z.string().min(1, "agentId is required"),
	bufferArray: z.array(z.number()).min(1, "bufferArray must contain at least one number"),
});

export async function POST(req: Request) {
	let body: { agentId: string; bufferArray: number[] };
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

	const { agentId, bufferArray } = parseResult.data;

	try {
		const result = await uploadDb(agentId, bufferArray);
		if (result.state === "success") {
			return NextResponse.json({ success: true, data: result }, { status: 200 });
		} else {
			return NextResponse.json({ success: false, message: "Failed to upload the db.sqlite file." }, { status: 500 });
		}
	} catch (error: any) {
		console.error("Error in uploadDb API:", error);
		return NextResponse.json({ success: false, message: error.message || "Internal Server Error." }, { status: 500 });
	}
}

// Handle CORS Preflight Requests (Optional)
export async function OPTIONS(req: Request) {
	return NextResponse.json({}, { status: 200 });
}
