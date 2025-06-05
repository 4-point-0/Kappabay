"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";

export default function BackgroundFooter() {
	const path = usePathname() || "";
	const baseClass = "absolute left-0 right-0 z-0 w-full h-auto";

	// case 1: only on the home page
	if (path === "/") {
		return (
			<div className={`${baseClass} top-[50vh]`}>
				<Image
					src="/mountains-background.png"
					alt="Mountain Landscape"
					width={1920}
					height={600}
					className="object-cover"
					priority
				/>
			</div>
		);
	}

	// case 2: hide on all /kappabae/* routes
	if (path.startsWith("/kappabae")) {
		return null;
	}

	// case 3: on all other routes
	return (
		<div className={`${baseClass} top-[275vh]`}>
			<Image
				src="/field-background.png"
				alt="Mountain Landscape"
				width={1920}
				height={600}
				className="object-cover"
				priority
			/>
		</div>
	);
}
