"use server";

import { collectFeesOnce } from "./collect-fee-cron";
import { collectMemoriesOnce } from "./collect-memories-cron";

// guard so we only schedule once per process
declare global {
	var __cronManagerScheduled: boolean | undefined;
}

async function cronManager() {
	// 1) On startup: collect fees, then sync memories
	await collectFeesOnce();
	await collectMemoriesOnce().catch(console.error);

	// 2) Schedule fee collection every hour
	setInterval(() => {
		collectFeesOnce().catch(console.error);
	}, 60 * 60 * 1000);

	// 3) Schedule memory sync every 6 hours
	setInterval(() => {
		collectMemoriesOnce().catch(console.error);
	}, 6 * 60 * 60 * 1000);
}

if (!global.__cronManagerScheduled) {
	global.__cronManagerScheduled = true;
	cronManager().catch(console.error);
}
