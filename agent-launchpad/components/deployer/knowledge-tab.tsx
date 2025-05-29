"use client";
import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { PlusCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  agentId: string;
}

export default function KnowledgeTab({ agentId }: Props) {
  // keep a real array so we can add/remove individual items
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    // filter only .txt/.md
    const valid = Array.from(selected).filter((f) =>
      [".txt", ".md"].some((ext) => f.name.endsWith(ext))
    );
    if (!valid.length) {
      return toast({ title: "Only .txt or .md files allowed", variant: "destructive" });
    }
    // append new files (no duplicates by name)
    setFiles((prev) => [
      ...prev,
      ...valid.filter((f) => !prev.some((p) => p.name === f.name)),
    ]);
    // clear input so same file can be picked again later
    e.target.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async () => {
    if (!files.length || !agentId) {
      return toast({ title: "Select files first", variant: "destructive" });
    }
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    try {
      const res = await fetch(`/agents/${agentId}/knowledge`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Knowledge uploaded" });
      setFiles([]);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="capitalize">Knowledge Files</Label>
            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
              <PlusCircle className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          <input
            type="file"
            multiple
            accept=".txt,.md"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFiles}
          />
          <div className="flex flex-wrap gap-2">
            {files.map((file, idx) => (
              <Badge key={idx} className="flex items-center gap-1 px-3 py-1">
                {file.name}
                <Button variant="ghost" size="icon" onClick={() => removeFile(idx)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
        <Button onClick={handleUpload} disabled={!files.length}>
          Upload
        </Button>
      </CardContent>
    </Card>
  );
}
