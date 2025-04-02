"use client";
import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { PotatoBakeModal } from "./potato-bake-modal";
import { UUID } from "@elizaos/core";

type BakeFlowStep = "bake" | "register";

export function BakeModal({ agentId }: { agentId: UUID }) {
	const [open, setOpen] = useState(false);
	const [currentStep, setCurrentStep] = useState<BakeFlowStep>("bake");
	const [isLoading, setIsLoading] = useState(false);
	const { toast } = useToast();

	// Reset state when modal closes
	const handleOpenChange = (isOpen: boolean) => {
		setOpen(isOpen);
		if (!isOpen) {
			setCurrentStep("bake");
			setIsLoading(false);
		}
	};

	const handleBakeSuccess = () => {
		setCurrentStep("register");
		toast({
			title: "Baking Complete!",
			description: "Your potato is baked and in your wallet.",
		});
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<div className="buttonContainer">
					<div className="chillButton">
						<span className="sr-only">Bake potato</span>
						<div className="pulseRing"></div>
					</div>
					<div className="animatedText">Bake a Potato</div>
				</div>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{currentStep === "bake" ? "Bake Hot Potato" : "Register Potato"}</DialogTitle>
					<DialogDescription>
						{currentStep === "bake" ? "Bake a fresh new potato" : "Register your baked potato"}
					</DialogDescription>
				</DialogHeader>

				<PotatoBakeModal
					agentId={agentId}
					onBakeSuccess={handleBakeSuccess}
					onCancel={() => setOpen(false)}
					isLoading={isLoading}
					setIsLoading={setIsLoading}
					setOpen={setOpen}
				/>
			</DialogContent>

			<style jsx>{`
				.buttonContainer {
					position: fixed;
					bottom: 5rem;
					left: 4.5rem;
					display: flex;
					flex-direction: column;
					align-items: center;
					gap: 10px;
					z-index: 40;
				}

				.chillButton {
					position: relative;
					z-index: 0;
					width: 100px;
					height: 100px;
					background: url("/hotpotato.png") no-repeat center/cover;
					border-radius: 50%;
					cursor: pointer;
					animation: gentleFloat 5s ease-in-out infinite;
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
					transition: transform 0.3s ease;
				}

				.chillButton:hover {
					transform: scale(1.05);
				}

				.animatedText {
					font-size: 1.2rem;
					font-weight: 500;
					color: hsl(var(--foreground));
					text-align: center;
					opacity: 0;
					animation: textFade 5s ease-in-out infinite;
					text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
					letter-spacing: 0.5px;
				}

				@keyframes textFade {
					0%,
					100% {
						opacity: 0.5;
						transform: translateY(0);
					}
					50% {
						opacity: 1;
						transform: translateY(-3px);
					}
				}

				.pulseRing {
					position: absolute;
					top: -10px;
					left: -10px;
					right: -10px;
					bottom: -10px;
					border-radius: 50%;
					border: 2px solid hsl(var(--primary) / 0.5);
					opacity: 0;
					animation: pulse 3s ease-out infinite;
				}

				@keyframes gentleFloat {
					0%,
					100% {
						transform: translateY(0) rotate(0deg);
					}
					25% {
						transform: translateY(-5px) rotate(1deg);
					}
					50% {
						transform: translateY(-8px) rotate(0deg);
					}
					75% {
						transform: translateY(-3px) rotate(-1deg);
					}
				}

				@keyframes pulse {
					0% {
						transform: scale(0.95);
						opacity: 0;
					}
					50% {
						opacity: 0.6;
					}
					100% {
						transform: scale(1.3);
						opacity: 0;
					}
				}
			`}</style>
		</Dialog>
	);
}
