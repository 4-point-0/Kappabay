// File: app/api/sui/admin-caps/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET(req: NextRequest) {
    const url = new URL(req.url);

    // Get the owner address from the query parameter
    const owner = url.searchParams.get('walletAddress');
    
    if (!owner) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    try {
      // Use findFirst instead of findUnique since agentWalletAddress is not a unique field
      const agent = await prisma.agent.findFirst({
        where: { 
          agentWalletAddress: owner 
        },
      });
      
      if (!agent) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        );
      }
      
      // Exclude oracle-related fields and agentWalletKey
      const {
        hasOracle,
        oraclePort,
        oraclePid,
        agentWalletKey,
        ...agentInfo
      } = agent;
      
      return NextResponse.json(agentInfo);
    } catch (error) {
      console.error("Failed to get agent info:", error);
      return NextResponse.json(
        { error: 'Failed to get agent information' },
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