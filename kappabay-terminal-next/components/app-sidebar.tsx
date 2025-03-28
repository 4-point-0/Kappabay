"use client";
import { useQuery } from "@tanstack/react-query";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
} from "@/components/ui/sidebar";
import { apiClient } from "@/lib/api";
import type { UUID } from "@elizaos/core";
import { User } from "lucide-react";
import ConnectionStatus from "./connection-status";
import NftStatus from "./nft-status";
import TransferModal from "./transfer-modal";
import { useOwnedObjects } from "@/hooks/use-owned-objects";
import { BakeModal } from "./bake-modal";
import Link from "next/link"; // Import Link from next/link
import { usePathname } from "next/navigation"; // Import usePathname
import { useCheckPotatoStatus } from "@/hooks/useCheckPotatoStatus";
import { useToast } from "./ui/use-toast";

export function AppSidebar() {
	const pathname = usePathname(); // Replace useLocation with usePathname
	const { modalObjects, capObjects, nftObjects } = useOwnedObjects();
	const modalObjId = modalObjects?.[0]?.data?.objectId;
	const capObjId = capObjects?.[0]?.data?.objectId;
	const potatoObjId = nftObjects?.[0]?.data?.objectId;
	const query = useQuery({
		queryKey: ["agents"],
		queryFn: () => apiClient.getAgents(),
		refetchInterval: 60_000,
	});

	const agents = query?.data?.agents;

	const isPotatoOwned = capObjId && potatoObjId;
	const isModalOwned = modalObjId;

	return (
		<Sidebar>
			<SidebarContent className="pt-[5vh]">
				<SidebarGroup>
					<SidebarGroupLabel>Agents</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<span>{query?.isPending}</span>
							{query?.isPending ? (
								<div>
									{Array.from({ length: 5 }).map((_, index) => (
										<SidebarMenuItem key={`skeleton-item-${index}`}>
											<SidebarMenuSkeleton />
										</SidebarMenuItem>
									))}
								</div>
							) : (
								<div>
									{agents?.map((agent: { id: UUID; name: string }) => (
										<SidebarMenuItem key={agent.id}>
											<Link href={`/chat/${agent.id}`} passHref>
												<SidebarMenuButton isActive={pathname?.includes(agent.id)}>
													<User />
													<span>{agent.name}</span>
												</SidebarMenuButton>
											</Link>
										</SidebarMenuItem>
									))}
								</div>
							)}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup>
					<NftStatus />
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					{isPotatoOwned && <TransferModal nftObjectId={potatoObjId} capObjectId={capObjId} />}
					{!isPotatoOwned && isModalOwned && <BakeModal agentId={agents?.[0].id} />}
					<ConnectionStatus />
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
