"use client";
import { StatusContent } from "@/components/status/status-content";

export default function WaifuStatusPage() {
	return (
		<StatusContent
			createHref="/kappabae/create"
			createButtonText="Create New Companion"
			moneyLabel="Pocket Money"
			filterByAgentType="kappabay-create"
		/>
	);
}
