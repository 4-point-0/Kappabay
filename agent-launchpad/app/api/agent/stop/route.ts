import { stopService } from "@/lib/actions/manage-docker-service";

export async function POST(request: Request) {
  const { serviceId } = await request.json();
  try {
    await stopService(serviceId);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}
