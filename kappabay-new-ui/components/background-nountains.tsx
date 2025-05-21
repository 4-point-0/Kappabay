"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";

export default function BackgroundMountains() {
	const path = usePathname() || "";
	const baseClass = "absolute left-0 right-0 z-0 w-full h-auto";

	// on /kappabae/* use a different style
	if (path.startsWith("/kappabae")) {
		return (
			<div className={`${baseClass} top-[146vh]`}>
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

	// default for all other routes
	return (
		<div className={`${baseClass} top-[50vh]`}>
			<Image
				src="/mountains-background.png"
				alt="Mountain Landscape"
				width={1920}
				height={600}
				className="w-full h-auto"
				priority
			/>
		</div>
	);
}
