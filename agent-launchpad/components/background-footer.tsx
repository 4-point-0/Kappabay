"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";

export default function BackgroundFooter() {
	const path = usePathname() || "";
	const baseClass = "absolute left-0 right-0 z-[-1] w-full h-auto";

	// 1) main page “/”
	if (path === "/") return null;

	// 2) root of kappabae “/kappabae”
	if (path === "/kappabae") {
		return (
			<div className={`${baseClass} bottom-[-45vh]`}>
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
			<div className={`${baseClass} bottom-[-33vh]`}>
				{/* 4pto Labs logo and text - highest z-index */}
				<div className="absolute left-1/2 bottom-[25vh] -translate-x-1/2 text-center z-20">
					<div className="mb-2">
						<Image src="/logo-4pto.png" alt="4pto Labs Logo" width={120} height={40} className="mx-auto" />
					</div>
					<p className="dark:text-white text-background text-sm">By 4pto Labs</p>
				</div>
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
		<div className={`${baseClass} bottom-[-45vh]`}>
			{/* 4pto Labs logo and text - highest z-index */}
			<div className="absolute left-1/2 bottom-[25vh] -translate-x-1/2 text-center z-20">
				<div className="mb-2">
					<Image src="/logo-4pto.png" alt="4pto Labs Logo" width={120} height={40} className="mx-auto" />
				</div>
				<p className="dark:text-white text-background text-sm">By 4pto Labs</p>
			</div>
			<Image
				src="/main-func-background.png"
				alt="Main Functional Field Background"
				width={1920}
				height={600}
				className="object-cover"
				priority
			/>
		</div>
	);
}
