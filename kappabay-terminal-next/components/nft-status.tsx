"use client";
import { useState, useEffect } from "react";
import { useOwnedObjects } from "@/hooks/use-owned-objects";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Flame } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface PotatoData {
	objectId: string;
	version: string;
	digest: string;
	type: string;
	display: {
		data: {
			description: string;
			flavor: string;
			image_url: string;
			name: string;
			potato_type: string;
			temperature: string;
			time_remaining: string;
		};
	};
	content: {
		fields: {
			creation_time_ms: string;
			expiry_time_ms: string;
			flavor: string;
			potato_type: string;
			temperature: string;
			transfers: string[];
			last_transfer_time_ms: string;
		};
	};
}

export default function NftStatus() {
	const [open, setOpen] = useState(false);
	const [timeLeft, setTimeLeft] = useState<string>("");
	const [isExpired, setIsExpired] = useState<boolean>(false);
	const { nftObjects } = useOwnedObjects();
	const potatoData = nftObjects?.[0]?.data as unknown as PotatoData;

	useEffect(() => {
		if (!potatoData?.content?.fields?.last_transfer_time_ms) return;

		const lastTransferTime = Number(potatoData.content.fields.last_transfer_time_ms);
		const expiryTime = new Date(lastTransferTime + 30 * 60 * 1000); // Add 30 minutes

		const updateCountdown = () => {
			const now = new Date();
			if (now >= expiryTime) {
				setIsExpired(true);
				setTimeLeft("Expired");
				return;
			}

			const diffInSeconds = Math.floor((expiryTime.getTime() - now.getTime()) / 1000);
			const minutes = Math.floor(diffInSeconds / 60);
			const seconds = diffInSeconds % 60;

			setTimeLeft(`${minutes}m ${seconds.toString().padStart(2, "0")}s`);
		};

		// Initial update
		updateCountdown();

		// Set up interval
		const intervalId = setInterval(updateCountdown, 1000);

		// Clean up interval on unmount
		return () => clearInterval(intervalId);
	}, [potatoData]);

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
	};

	if (!potatoData) {
		return (
			<Button variant="outline" size="sm" className="gap-2" disabled>
				<Flame className="h-4 w-4 text-orange-500" />
				Potato Status
			</Button>
		);
	}

	return (
		<>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button variant="outline" size="sm" className="gap-2">
						<Flame className="h-4 w-4 text-orange-500" />
						Potato Status
					</Button>
				</DialogTrigger>
				<DialogContent className="w-fit max-w-fit">
					<DialogHeader>
						<DialogTitle>Hot Potato Details</DialogTitle>
						<DialogDescription>Information about your sizzling potato</DialogDescription>
					</DialogHeader>

					{potatoData ? (
						<div className="grid gap-4">
							<Card>
								<CardHeader className="pb-3">
									<div className="flex items-center justify-between">
										<CardTitle>{potatoData.display.data.name}</CardTitle>
										<Badge variant="secondary" className="text-orange-500">
											{potatoData.display.data.temperature}
										</Badge>
									</div>
									<CardDescription>{potatoData.display.data.description}</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="flex flex-col items-center gap-4">
										<img
											src={potatoData.display.data.image_url}
											alt="Hot Potato"
											className="rounded-md w-full max-w-[300px]"
										/>
										<div className="grid grid-cols-2 gap-4 w-full">
											<div className="space-y-1">
												<p className="text-sm font-medium">Type</p>
												<p className="text-sm">{potatoData.display.data.potato_type}</p>
											</div>
											<div className="space-y-1">
												<p className="text-sm font-medium">Flavor</p>
												<p className="text-sm">{potatoData.display.data.flavor}</p>
											</div>
											<div className="space-y-1">
												<p className="text-sm font-medium">Created</p>
												<p className="text-sm">
													{new Date(Number(potatoData.content.fields.creation_time_ms)).toLocaleString()}
												</p>
											</div>
											<div className="space-y-1">
												<p className="text-sm font-medium">Expires</p>
												<p className="text-sm">
													{new Date(Number(potatoData.content.fields.expiry_time_ms)).toLocaleString()}
												</p>
											</div>
											<div className="space-y-1">
												<p className="text-sm font-medium">Time Remaining</p>
												<p className="text-sm">
													{isExpired ? (
														<span className="text-red-500">Expired</span>
													) : (
														<span className="text-green-500">{timeLeft}</span>
													)}
												</p>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>

							<Separator />

							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<h3 className="font-medium">Technical Details</h3>
									<Badge variant="outline">{potatoData.content.fields.transfers?.length || 0} transfers</Badge>
								</div>

								<div className="grid gap-2">
									<div className="flex items-center justify-between">
										<span className="text-sm text-muted-foreground">Object ID</span>
										<div className="flex items-center gap-2">
											<code className="text-sm">{potatoData.objectId}</code>
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															className="h-6 w-6"
															onClick={() => copyToClipboard(potatoData.objectId)}
														>
															<Copy className="h-3 w-3" />
														</Button>
													</TooltipTrigger>
													<TooltipContent>Copy to clipboard</TooltipContent>
												</Tooltip>
											</TooltipProvider>
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button variant="ghost" size="icon" className="h-6 w-6" asChild>
															<a
																href={`https://suiexplorer.com/object/${potatoData.objectId}?network=testnet`}
																target="_blank"
																rel="noopener noreferrer"
															>
																<ExternalLink className="h-3 w-3" />
															</a>
														</Button>
													</TooltipTrigger>
													<TooltipContent>View in Explorer</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</div>
									</div>

									<div className="flex items-center justify-between">
										<span className="text-sm text-muted-foreground">Type</span>
										<code className="text-sm">{potatoData.type}</code>
									</div>

									<div className="flex items-center justify-between">
										<span className="text-sm text-muted-foreground">Digest</span>
										<code className="text-sm">{potatoData.digest}</code>
									</div>
								</div>
							</div>
						</div>
					) : (
						<div className="text-center py-8">
							<p className="text-muted-foreground">No Hot Potato found in your wallet</p>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
