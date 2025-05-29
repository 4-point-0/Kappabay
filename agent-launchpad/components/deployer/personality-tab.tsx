"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  agentConfig: any;
  handleArrayChange: (field: string, index: number, value: string) => void;
  handleArrayAdd: (field: string) => void;
  handleArrayRemove: (field: string, index: number) => void;
}
export default function PersonalityTab({
  agentConfig,
  handleArrayChange,
  handleArrayAdd,
  handleArrayRemove,
}: Props) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {/** Bio, Lore, Knowledge sections */}
        {["bio", "lore", "knowledge"].map((field) => (
          <div className="space-y-2" key={field}>
            <div className="flex justify-between items-center">
              <Label className="capitalize">{field}</Label>
              <Button variant="ghost" size="sm" onClick={() => handleArrayAdd(field)}>
                <PlusCircle className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {agentConfig[field].map((item: string, idx: number) => (
              <div key={`${field}-${idx}`} className="flex items-center space-x-2">
                <Input
                  value={item}
                  onChange={(e) => handleArrayChange(field, idx, e.target.value)}
                  placeholder={`Enter ${field} line`}
                />
                <Button variant="ghost" size="icon" onClick={() => handleArrayRemove(field, idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ))}
        {/** Topics & Adjectives */}
        {["topics", "adjectives"].map((field) => (
          <div className="space-y-2" key={field}>
            <div className="flex justify-between items-center">
              <Label className="capitalize">{field}</Label>
              <Button variant="ghost" size="sm" onClick={() => handleArrayAdd(field)}>
                <PlusCircle className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {agentConfig[field].map((val: string, idx: number) => (
                <Badge key={`${field}-${idx}`} className="flex items-center gap-1 px-3 py-1">
                  {val}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => handleArrayRemove(field, idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              <Input
                className="w-40 h-8"
                placeholder={`Add ${field.slice(0, -1)}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value) {
                    handleArrayAdd(field);
                    handleArrayChange(field, agentConfig[field].length, e.currentTarget.value);
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
