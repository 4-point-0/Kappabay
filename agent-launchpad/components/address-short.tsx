import { copyToClipboard } from "@/lib/utils";
import { Button } from "./ui/button";

export const AddressShort = ({ address, endIndex = 5 }: { address: string; endIndex?: number }) => {
	return (
		<div className="flex items-center space-x-2">
			<span>{address.substring(0, endIndex)}...</span>
			<Button
				variant="ghost"
				size="icon"
				className="h-6 w-6"
				onClick={() => copyToClipboard(address)}
				title="Copy full ID"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
					<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
				</svg>
			</Button>
		</div>
	);
};
