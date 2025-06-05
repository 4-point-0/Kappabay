"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";

export default function BackgroundFooter() {
	const path = usePathname() || "";
	const baseClass = "absolute left-0 right-0 z-0 w-full h-auto";

	// 1) main page “/”
	if (path === "/") {
		return (
			<div className={`${baseClass} top-[50vh]`}>
				<Image
					src="/main-background.png"
					alt="Main Background"
					width={1920}
					height={600}
					className="object-cover"
					priority
				/>
			</div>
		);
	}

	// 2) root of kappabae “/kappabae”
	if (path === "/kappabae") {
		return (
			<div className={`${baseClass} top-[50vh]`}>
				<Image
					src="/kappabae-background.png"
					alt="Kappabae Background"
					width={1920}
					height={600}
					className="object-cover"
					priority
				/>
			</div>
		);
	}

	// 3) all other kappabae routes
	if (path.startsWith("/kappabae/")) {
		return (
			<div className={`${baseClass} top-[275vh]`}>
				<Image
					src="/kappabae-func-background.png"
					alt="Kappabae Functional Background"
					width={1920}
					height={600}
					className="object-cover"
					priority
				/>
			</div>
		);
	}

	// 4) all other pages
	return (
		<div className={`${baseClass} top-[275vh]`}>
			<Image
				src="/main-func-field.png"
				alt="Main Functional Field Background"
				width={1920}
				height={600}
				className="object-cover"
				priority
			/>
		</div>
	);
}
