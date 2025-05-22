import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { PrismaClient } from "@prisma/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decrypt } from "../utils";

const prisma = new PrismaClient();

export async function getAgentKeypair(agentId: string) {
	const agent = await prisma.agent.findUniqueOrThrow({ where: { id: agentId } });
	if (!agent.agentWalletKey) throw new Error("Missing agentWalletKey");
	const secret = decrypt(agent.agentWalletKey);
	const keypair = Ed25519Keypair.fromSecretKey(secret);
	const address = keypair.getPublicKey().toSuiAddress();
	return { keypair, address, agent };
}

export async function getAdminCapId(client: SuiClient, owner: string) {
	const pkg = process.env.NEXT_PUBLIC_DEPLOYER_CONTRACT_ID!;
	const capType = `${pkg}::agent::AdminCap`;
	const resp = await client.getOwnedObjects({ owner, options: { showType: true } });
	const cap = resp.data.find((o) => o.data?.type === capType);
	if (!cap?.data?.objectId) throw new Error("No AdminCap found");
	return cap.data.objectId;
}

export async function getObjectFields(client: SuiClient, objectId: string) {
	const resp = await client.getObject({ id: objectId, options: { showContent: true } });
	const fields = (resp.data?.content as any)?.fields;
	if (!fields) throw new Error("No fields found");
	return fields;
}
