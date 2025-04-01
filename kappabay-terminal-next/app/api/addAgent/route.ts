import { NextResponse } from "next/server";
import { addAgent } from "@/app/actions/add-agent";
import Joi from "joi";

// Define a validation schema using Joi
const schema = Joi.object({
	suiWalletAddress: Joi.string().required(),
	agentCapId: Joi.string().required(),
});

export async function POST(req: Request) {
	let body;
	try {
		body = await req.json();
	} catch (error) {
		return NextResponse.json({ success: false, message: "Invalid JSON format." }, { status: 400 });
	}

	const { error, value } = schema.validate(body);
	if (error) {
		return NextResponse.json({ success: false, message: error.details[0].message }, { status: 400 });
	}

	const { suiWalletAddress, agentCapId } = value;

	// 3. Invoke the addAgent Server Action
	try {
		const result = await addAgent(suiWalletAddress, agentCapId);
		if (result.success) {
			return NextResponse.json({ success: true, data: result }, { status: 200 });
		} else {
			return NextResponse.json({ success: false, message: result.error || "Failed to add agent." }, { status: 500 });
		}
	} catch (error: any) {
		console.error("Error in addAgent API:", error);
		return NextResponse.json({ success: false, message: error.message || "Internal Server Error." }, { status: 500 });
	}
}

// Handle CORS Preflight Requests (Optional)
// Since `next.config.mjs` handles CORS headers, this is often unnecessary.
// However, it's good practice to handle it explicitly.
export async function OPTIONS(req: Request) {
	return NextResponse.json({}, { status: 200 });
}
