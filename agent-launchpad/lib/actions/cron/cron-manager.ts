"use server";

import { collectFeesOnce } from "./collect-fee-cron";
import { collectMemoriesOnce } from "./collect-memories-cron";

// guard so we only schedule once per process
declare global {
	var __cronManagerScheduled: boolean | undefined;
}

async function cronManager() {
	// 1) On startup: collect fees, then memories
	await collectFeesOnce();
	await collectMemoriesOnce().catch(console.error);

	// 2) Now loop: run fee hourly, and every 6th run sync memories.
	let memCounter = 0;
	const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

	while (true) {
		// sleep 1 hour
		await delay(60 * 60 * 1000);

		// run fee job
		await collectFeesOnce().catch(console.error);
		memCounter++;

		// every 6th hour run memory job
		if (memCounter >= 6) {
			memCounter = 0;
			await collectMemoriesOnce().catch(console.error);
		}
	}
}

if (!global.__cronManagerScheduled) {
	global.__cronManagerScheduled = true;
	cronManager().catch(console.error);
}
