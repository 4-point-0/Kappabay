import { prisma } from "../db";

export async function getAgentInfo(capId: string) {
  try {
    // Get agent details from database
    const agent = await prisma.agent.findUnique({
      where: { capId },
    });
    
    if (!agent) {
      return null;
    }
    
    // Exclude oracle-related fields and agentWalletKey
    const {
      hasOracle,
      oraclePort,
      oraclePid,
      agentWalletKey,
      ...agentInfo
    } = agent;
    
    return agentInfo;
  } catch (error) {
    console.error("Failed to get agent info:", error);
    return null;
  }
}