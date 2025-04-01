import { NextResponse } from "next/server";
import { uploadDb } from "@/app/actions/upload-db";
import { z } from "zod";

// Define a validation schema using Zod
const schema = z.object({
	agentId: z.string().min(1, "agentId is required"),
	file: z
		.instanceof(File, "file must be a valid File object")
		.refine((file) => file.type === "application/vnd.sqlite3", "Only .sqlite files are allowed"),
});

export async function POST(req: Request) {
    // Parse form data
    const formData = await req.formData();
    const agentId = formData.get("agentId");
    const file = formData.get("file");

    // Validate form data
    if (typeof agentId !== "string" || !file || !(file instanceof File)) {
        return NextResponse.json({ success: false, message: "Invalid form data." }, { status: 400 });
    }

    const parseResult = schema.safeParse({ agentId, file });
    if (!parseResult.success) {
        const errorMessage = parseResult.error.errors[0].message;
        return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
    }

    // Convert file to number[]
    const arrayBuffer = await file.arrayBuffer();
    const bufferArray = Array.from(new Uint8Array(arrayBuffer));

	try {
		const result = await uploadDb(agentId, bufferArray as number[]);
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
