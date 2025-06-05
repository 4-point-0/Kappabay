"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";

export default function BackgroundFooter() {
	const path = usePathname() || "";
	const baseClass = "absolute left-0 right-0 z-0 w-full h-auto";

	// on /kappabae use a different style
	if (path === "/kappabae") {
		return (
			<div className={`${baseClass} top-[275vh]`}>
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

	// on /functionalities use a different style
	if (path !== "/kappabae") {
		return (
			<div className={`${baseClass} top-[275vh]`}>
				<Image
					src="/mountains-field.png"
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
			<div className="absolute left-1/2 bottom-[18rem] -translate-x-1/2 text-center z-20">
				<div className="mb-2">
					<Image src="/logo-4pto.png" alt="4pto Labs Logo" width={120} height={40} className="mx-auto" />
				</div>
				<p className="dark:text-white text-background text-sm">By 4pto Labs</p>
			</div>
		</div>
	);
}
