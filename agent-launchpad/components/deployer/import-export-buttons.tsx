"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download } from "lucide-react";

interface Props {
	importConfig: () => void;
	exportConfig: () => void;
	fileInputRef: React.RefObject<HTMLInputElement | null> | null;
}
export default function ImportExportButtons({ importConfig, exportConfig, fileInputRef }: Props) {
	return (
		<>
			<Button variant="outline" onClick={importConfig}>
				<Upload className="mr-2 h-4 w-4" /> Import
			</Button>
			<Button variant="outline" onClick={exportConfig}>
				<Download className="mr-2 h-4 w-4" /> Export
			</Button>
			<input type="file" ref={fileInputRef} onChange={(e) => {}} accept=".json" className="hidden" />
		</>
	);
}
