"use client";
import { StatusContent } from "@/components/status/status-content";

export default function StatusPage() {
	return <StatusContent createHref="/deploy" createButtonText="Deploy New Agent" />;
}
