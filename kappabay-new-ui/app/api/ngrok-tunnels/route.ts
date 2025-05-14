import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const port = searchParams.get("port");
	if (!port) {
		return NextResponse.json({ error: "missing port" }, { status: 400 });
	}
	// server-side fetch to ngrok’s API (no CORS here)
	const res = await fetch(`http://localhost:${port}/api/tunnels`);
	const text = await res.text();
	return new NextResponse(text, {
		status: res.status,
		headers: { "Content-Type": "application/xml" },
	});
}
