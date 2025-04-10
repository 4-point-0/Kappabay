// File: app/api/sui/admin-caps/route.ts
import { SuiClient } from '@mysten/sui/client';
import { type NextRequest, NextResponse } from 'next/server';

// Initialize the Sui client
// Replace with your preferred RPC endpoint
const suiClient = new SuiClient({
  url: process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443',
});

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    // Get the package ID from the query parameter
    const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x0c4671462cacb9605bb026c4a1cae8745f04d0bbab6836c146235ef4bc8c2170';
    // Get the owner address from the query parameter
    const owner = url.searchParams.get('owner');
    
    if (!packageId) {
      return NextResponse.json(
        { error: 'Package ID is required' },
        { status: 400 }
      );
    }

    if (!owner) {
      return NextResponse.json(
        { error: 'Owner address is required' },
        { status: 400 }
      );
    }

    // Query for objects with type that contains AdminCap from the specific package
    const { data: adminCaps } = await suiClient.getOwnedObjects({
      owner: owner,
      filter: {
        StructType: `${packageId}::*::AdminCap`
      },
      options: {
        showContent: true,
        showType: true,
        showOwner: true,
      }
    });

    return NextResponse.json({ adminCaps });
  } catch (error) {
    console.error('Error fetching AdminCap objects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AdminCap objects' },
      { status: 500 }
    );
  }
}

// To handle CORS if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}