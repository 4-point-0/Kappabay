"use client";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  aiDescription: string;
  setAiDescription: (s: string) => void;
  isGenerating: boolean;
  onGenerate: (desc: string) => void;
}
export default function AiAssistModal({
  open,
  onOpenChange,
  aiDescription,
  setAiDescription,
  isGenerating,
  onGenerate,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI Assist</DialogTitle>
          <DialogDescription>
            Describe your character in as much detail as possible. Provide all context you think is necessary.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="A cheerful and helpful AI assistant named Nova…"
          value={aiDescription}
          onChange={(e) => setAiDescription(e.target.value)}
          className="min-h-[150px] w-full placeholder:text-gray-500 placeholder:opacity-90"
        />
        <DialogFooter>
          <DialogClose>Close</DialogClose>
          <Button
            variant="outline"
            onClick={() => onGenerate(aiDescription)}
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "AI Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
