"use client";
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Props {
  agentId: string;
}

export default function KnowledgeTab({ agentId }: Props) {
  const [files, setFiles] = useState<FileList | null>(null);
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    // filter only .txt/.md
    const valid = Array.from(selected).filter((f) =>
      [".txt", ".md"].some((ext) => f.name.endsWith(ext))
    );
    setFiles(valid.length ? (valid as unknown as FileList) : null);
    if (!valid.length) toast({ title: "Only .txt or .md files allowed", variant: "destructive" });
  };

  const handleUpload = async () => {
    if (!files || !agentId) {
      return toast({ title: "Select files first", variant: "destructive" });
    }
    const form = new FormData();
    Array.from(files).forEach((f) => form.append("files", f));
    try {
      const res = await fetch(`/agents/${agentId}/knowledge`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Knowledge uploaded" });
      setFiles(null);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Label>Upload RAG Knowledge (.txt, .md)</Label>
          <input
            type="file"
            multiple
            accept=".txt,.md"
            onChange={handleFiles}
            className="block w-full text-sm text-gray-700"
          />
        </div>
        <Button onClick={handleUpload} disabled={!files}>
          Upload
        </Button>
      </CardContent>
    </Card>
  );
}
