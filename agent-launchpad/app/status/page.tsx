"use client";
import BackgroundFooter from "@/components/background-footer";
import { StatusContent } from "@/components/status/status-content";

export default function StatusPage() {
	return (
		<>
			<StatusContent createHref="/deploy" createButtonText="Deploy New Agent" />;
			<BackgroundFooter />
		</>
	);
}
