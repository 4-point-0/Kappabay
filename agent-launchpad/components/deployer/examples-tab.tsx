"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Props {
  agentConfig: any;
  setAgentConfig: React.Dispatch<React.SetStateAction<any>>;
  handleArrayChange: (field: string, index: number, value: string) => void;
  handleArrayAdd: (field: string) => void;
  handleArrayRemove: (field: string, index: number) => void;
}
export default function ExamplesTab({
  agentConfig,
  setAgentConfig,
  handleArrayChange,
  handleArrayAdd,
  handleArrayRemove,
}: Props) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {/** Message Examples */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Message Examples</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setAgentConfig((prev: any) => ({
                  ...prev,
                  messageExamples: [
                    ...prev.messageExamples,
                    [
                      { user: "{{user1}}", content: { text: "" } },
                      {
                        user: prev.name.toLowerCase().replace(/\s+/g, "-"),
                        content: { text: "" },
                      },
                    ],
                  ],
                }))
              }
            >
              <PlusCircle className="h-4 w-4 mr-1" /> Add Example
            </Button>
          </div>
          {agentConfig.messageExamples.map((ex: any[], exIdx: number) => (
            <div key={`ex-${exIdx}`} className="border rounded-md p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Example {exIdx + 1}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setAgentConfig((prev: any) => ({
                      ...prev,
                      messageExamples: prev.messageExamples.filter((_: any, i: number) => i !== exIdx),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {ex.map((msg, msgIdx) => (
                <div key={`msg-${exIdx}-${msgIdx}`} className="space-y-2">
                  <Badge variant={msg.user === "{{user1}}" ? "outline" : "default"}>
                    {msg.user === "{{user1}}" ? "User" : "Agent"}
                  </Badge>
                  <Textarea
                    value={msg.content.text}
                    onChange={(e) => {
                      const newEx = [...agentConfig.messageExamples];
                      newEx[exIdx][msgIdx].content.text = e.target.value;
                      setAgentConfig((prev: any) => ({ ...prev, messageExamples: newEx }));
                    }}
                    placeholder={msg.user === "{{user1}}" ? "Enter user message" : "Enter agent response"}
                    className="min-h-[80px]"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        {/** Post Examples */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Post Examples</Label>
            <Button variant="ghost" size="sm" onClick={() => handleArrayAdd("postExamples")}>
              <PlusCircle className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          {agentConfig.postExamples.map((item: string, idx: number) => (
            <div key={`post-${idx}`} className="flex items-center space-x-2">
              <Textarea
                value={item}
                onChange={(e) => handleArrayChange("postExamples", idx, e.target.value)}
                placeholder="Enter post example"
              />
              <Button variant="ghost" size="icon" onClick={() => handleArrayRemove("postExamples", idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
