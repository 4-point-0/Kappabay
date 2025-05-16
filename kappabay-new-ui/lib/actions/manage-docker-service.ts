// app/lib/actions/manage-docker-service.ts
"use server";

import fs from "fs";
import path from "path";
import util from "util";
import FormData from "form-data";
import { pipeline } from "stream";
import { promisify } from "util";
import { prisma } from "../db";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import { uploadBlob, retrieveBlob } from "@/lib/walrus-api";
import { Agent } from "https";
import axios from "axios";

const exec = util.promisify(require("child_process").exec);
const DB_CACHE_DIR = path.join(process.cwd(), "db-cache");

const streamPipeline = promisify(pipeline);

const PORTAINER_URL = process.env.PORTAINER_URL!; // e.g., http://localhost:9000/api
const PORTAINER_API_KEY = process.env.PORTAINER_API_KEY!;
const PORTAINER_ENDPOINT_ID = process.env.PORTAINER_ENDPOINT_ID!; // e.g., '1'

async function portainerFetch(path: string, options: any = {}) {
	const response = await axios({
		method: options.method || "GET",
		url: `${PORTAINER_URL}${path}`,
		headers: {
			"X-API-Key": PORTAINER_API_KEY,
			...(options.headers || {}),
		},
		httpsAgent: new Agent({ rejectUnauthorized: false }), // Bypass self-signed certificate
		...options,
	});

	if (response.status < 200 || response.status >= 300) {
		throw new Error(`Portainer API error (${response.status}): ${response.data}`);
	}

	return response;
}

async function getContainerId(name: string): Promise<string> {
	const response = await portainerFetch(`/api/endpoints/${PORTAINER_ENDPOINT_ID}/docker/containers/json?all=1`);
	const containers = response.data;
	console.log("name", name);

	const match = containers.find((c: any) => {
		console.log("c.Names", c.Names);

		return c.Names?.some((n: string) => n.includes(name));
	});
	if (!match) throw new Error(`Container with name ${name} not found.`);
	return match.Id;
}

async function downloadDbFromContainer(containerId: string, containerPath: string, localPath: string) {
	const response = await portainerFetch(
		`/api/endpoints/${PORTAINER_ENDPOINT_ID}/docker/containers/${containerId}/archive?path=${encodeURIComponent(
			containerPath
		)}`,
		{ responseType: "stream" } // Enable streaming for binary data
	);

	if (!response.data) throw new Error("No response body from Portainer");

	const fileStream = fs.createWriteStream(`${localPath}`);
	await pipeline(response.data, fileStream);
}

async function uploadDbToContainer(containerId: string, containerPath: string, localPath: string) {
	const tarPath = localPath + ".tar";
	// Assumes you created a tar archive containing the file at the right containerPath
	const form = new FormData();
	form.append("file", fs.createReadStream(tarPath));

	await portainerFetch(
		`/endpoints/${PORTAINER_ENDPOINT_ID}/docker/containers/${containerId}/archive?path=${encodeURIComponent(
			containerPath.replace(/\/[^/]+$/, "")
		)}`,
		{
			method: "PUT",
			body: form as any,
			headers: form.getHeaders(),
		}
	);
}

async function getAgent(agentId: string) {
	const agent = await prisma.agent.findFirst({
		where: { id: agentId },
		select: {
			id: true,
			dockerServiceId: true,
			latestBlobHash: true,
			port: true,
			terminalPort: true,
			publicAgentUrl: true,
		},
	});
	if (!agent) throw new Error(`Agent ${agentId} not found.`);
	return agent;
}

export async function stopService(agentId: string, message: string, signature: string, address: string) {
	await verifyPersonalMessageSignature(Buffer.from(message, "utf8"), signature, { address });
	const agent = await getAgent(agentId);

	const containerName = `agent-${agent.id}`;
	const containerId = await getContainerId(containerName);
	const localDbPath = path.join(DB_CACHE_DIR, `db-${agentId}.sqlite`);
	const containerDbPath = "/app/eliza-kappabay-agent/agent/data/db.sqlite";

	await downloadDbFromContainer(containerId, containerDbPath, localDbPath);

	if (fs.existsSync(localDbPath)) {
		const fileBuffer = fs.readFileSync(localDbPath);
		const blobHash = await uploadBlob(fileBuffer);
		await prisma.agent.update({ where: { id: agentId }, data: { latestBlobHash: blobHash } });
	}

	await exec(`docker service update --replicas 0 ${agent.dockerServiceId}`);
	await prisma.agent.update({ where: { id: agentId }, data: { status: "INACTIVE", publicAgentUrl: null } });
}

export async function startService(agentId: string, message: string, signature: string, address: string) {
	await verifyPersonalMessageSignature(Buffer.from(message, "utf8"), signature, { address });
	const agent = await getAgent(agentId);

	const containerName = `agent-${agent.id}`;
	const localDbPath = path.join(DB_CACHE_DIR, `db-${agentId}.sqlite`);
	const containerDbPath = "/app/eliza-kappabay-agent/agent/data/db.sqlite";

	if (!fs.existsSync(localDbPath) && agent.latestBlobHash) {
		const fileBuffer = await retrieveBlob(agent.latestBlobHash);
		fs.writeFileSync(localDbPath, fileBuffer);
	}

	await exec(`docker service update --replicas 1 ${agent.dockerServiceId}`);
	await new Promise((r) => setTimeout(r, 2000));

	const containerId = await getContainerId(containerName);

	if (fs.existsSync(localDbPath)) {
		await uploadDbToContainer(containerId, containerDbPath, localDbPath);
		await exec(
			`docker exec -d ${containerId} sh -c "cd /app/eliza-kappabay-agent && exec pnpm start --characters=characters/agent.json"`
		);
	}

	await new Promise((r) => setTimeout(r, 5000));
	const logs = await exec(`docker service logs agent-${agentId}`);
	const match = logs.stdout.match(/https:\/\/[\w.-]+\.trycloudflare\.com/);
	const url = match?.[0] ?? null;

	await prisma.agent.update({
		where: { id: agentId },
		data: { status: "ACTIVE", publicAgentUrl: url },
	});
}
