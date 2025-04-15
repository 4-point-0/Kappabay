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
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppSidebar() {
	const pathname = usePathname();
	const query = useQuery({
		queryKey: ["agents"],
		queryFn: () => apiClient.getAgents(),
		refetchInterval: 60_000,
	});

	const agents = query?.data?.agents;

	return (
		<Sidebar>
			<SidebarContent className="pt-[5vh]">
				<SidebarGroup>
					<SidebarGroupLabel>Agent</SidebarGroupLabel>
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
				{/* <UploadDb /> */}
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<ConnectionStatus />
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
