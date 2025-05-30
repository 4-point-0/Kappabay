import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ScrollArea } from "../ui/scroll-area";

export function FilePreview({ file }: { file: File }) {
	const [text, setText] = useState<string>("");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setLoading(true);
		file.text().then((t) => {
			setText(t);
			setLoading(false);
		});
	}, [file]);

	if (loading) {
		return (
			<div className="p-4 flex justify-center">
				<Loader2 className="h-6 w-6 animate-spin" />
			</div>
		);
	}

	return (
		<ScrollArea className="h-60 w-full">
			<pre className="p-2 text-sm whitespace-pre-wrap">{text}</pre>
		</ScrollArea>
	);
}
