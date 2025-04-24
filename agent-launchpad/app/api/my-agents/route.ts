import { prisma } from "@/lib/db";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const ownerWallet = searchParams.get("ownerWallet");

	if (!ownerWallet) {
		return new Response(JSON.stringify({ error: "Missing wallet address." }), { status: 400 });
	}

	try {
		const agents = await prisma.agent.findMany({
			where: { ownerWallet },
		});
		return new Response(JSON.stringify(agents), { status: 200 });
	} catch (error: any) {
		return new Response(JSON.stringify({ error: error.message || "Failed to fetch agents." }), { status: 500 });
	}
}
