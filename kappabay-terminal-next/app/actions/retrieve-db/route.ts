import { NextResponse } from 'next/server';
import { getBlobHash } from '../../../lib/simpleDb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId');

  if (!agentId) {
    return NextResponse.json(
      { error: 'agentId is required and must be a string' },
      { status: 400 }
    );
  }

  try {
    const blobHash = await getBlobHash(agentId);

    if (!blobHash) {
      return NextResponse.json(
        { error: 'Blob hash not found for the provided agentId' },
        { status: 404 }
      );
    }

    return NextResponse.json({ blobHash }, { status: 200 });
  } catch (retrieveError) {
    console.error('Retrieve error:', retrieveError);
    return NextResponse.json(
      { error: 'Failed to retrieve the blob hash' },
      { status: 500 }
    );
  }
}
