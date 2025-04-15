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
import Image from "next/image";
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
												<SidebarMenuButton
													isActive={pathname?.includes(agent.id)}
													className="flex items-center justify-start w-full flex-grow h-[10em]"
												>
													<User />
													<div className="flex flex-col items-center w-full">
														<span className="text-center">{agent.name}</span>
														<Image
															src="/KappaBayTransparent.ico"
															alt={`${agent.name} avatar`}
															width={80} // 5em * 16px/em
															height={80} // 5em * 16px/em
															style={{ width: "5em", height: "5em" }}
															className="mt-2 rounded-full  transition-transform duration-300 hover:scale-105 z-10"
														/>
													</div>
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
