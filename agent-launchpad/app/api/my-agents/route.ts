export async function POST(request: Request) {
  const { agentId } = await request.json();
  try {
    await stopService(agentId);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}
