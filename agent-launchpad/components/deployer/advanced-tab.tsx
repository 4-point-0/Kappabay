"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";

interface Props {
  agentConfig: any;
  handleChange: (field: string, value: any) => void;
}
export default function AdvancedTab({ agentConfig, handleChange }: Props) {
  const sections: Array<keyof typeof agentConfig.style> = ["all", "chat", "post"];
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {sections.map((sect) => (
          <div key={sect}>
            <h4 className="text-sm font-medium mb-2 capitalize">{sect.replace(/^./, c => c.toUpperCase())} Style</h4>
            {agentConfig.style[sect].map((item: string, idx: number) => (
              <div key={`${sect}-${idx}`} className="flex items-center space-x-2 mb-2">
                <Input
                  value={item}
                  onChange={(e) => {
                    const newStyle = { ...agentConfig.style };
                    newStyle[sect][idx] = e.target.value;
                    handleChange("style", newStyle);
                  }}
                  placeholder={`Enter ${sect} guideline`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newStyle = { ...agentConfig.style };
                    newStyle[sect] = newStyle[sect].filter((_: any, i: number) => i !== idx);
                    handleChange("style", newStyle);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newStyle = { ...agentConfig.style };
                newStyle[sect] = [...newStyle[sect], ""];
                handleChange("style", newStyle);
              }}
            >
              <PlusCircle className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
