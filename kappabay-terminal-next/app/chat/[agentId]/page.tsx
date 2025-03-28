"use client";

import { useParams } from "next/navigation";
import Chat from "@/components/chat";

export default function ChatPage() {
	const { agentId } = useParams<{ agentId: string }>();

	return (
		<div className="flex flex-col h-full">
			<div className="flex-1 overflow-hidden">
				<Chat agentId={agentId as any} />
			</div>
		</div>
	);
}
