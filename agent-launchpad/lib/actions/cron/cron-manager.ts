"use server";

import { collectFeesOnce } from "./collect-fee-cron";
import { collectMemoriesOnce } from "./collect-memories-cron";

// guard so we only schedule once per process
declare global {
	var __cronManagerScheduled: boolean | undefined;
}

async function cronManager() {
	let memCounter = 0;

	// run immediately on startup
	await collectFeesOnce();
	memCounter++;
	new Promise((r) => setTimeout(r, 3000));
	if (memCounter >= 6) {
		memCounter = 0;
		await collectMemoriesOnce().catch(console.error);
	}

	// then schedule fee every hour
	setInterval(async () => {
		await collectFeesOnce();
		memCounter++;
		if (memCounter >= 6) {
			memCounter = 0;
			await collectMemoriesOnce().catch(console.error);
		}
	}, 60 * 60 * 1000);
}

if (!global.__cronManagerScheduled) {
	global.__cronManagerScheduled = true;
	cronManager().catch(console.error);
}
