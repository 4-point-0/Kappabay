import { NextResponse } from "next/server";
import { addAgent } from "@/app/actions/add-agent";
import { z } from "zod";

// Define a validation schema using Zod
const schema = z.object({
  suiWalletAddress: z.string().min(1, "suiWalletAddress is required"),
  agentCapId: z.string().min(1, "agentCapId is required"),
});

export async function POST(req: Request) {
  // 1. Rate Limiting
  try {
    await rateLimitMiddleware(req);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  // 2. Parse and Validate Request Body
  let body: { suiWalletAddress: string; agentCapId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON format." },
      { status: 400 }
    );
  }

  const parseResult = schema.safeParse(body);
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors[0].message;
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 400 }
    );
  }

  const { suiWalletAddress, agentCapId } = parseResult.data;

  // 3. Invoke the addAgent Server Action
  try {
    const result = await addAgent(suiWalletAddress, agentCapId);
    if (result.success) {
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    } else {
      return NextResponse.json(
        { success: false, message: result.error || "Failed to add agent." },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in addAgent API:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error." },
      { status: 500 }
    );
  }
}

// Handle CORS Preflight Requests (Optional)
export async function OPTIONS(req: Request) {
  return NextResponse.json({}, { status: 200 });
}
