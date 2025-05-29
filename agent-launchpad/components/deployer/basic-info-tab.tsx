"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface Props {
  agentConfig: any;
  imageUrl: string;
  setImageUrl: (url: string) => void;
  handleChange: (field: string, value: any) => void;
  handleNestedChange: (parent: string, field: string, value: any) => void;
}
export default function BasicInfoTab({
  agentConfig,
  imageUrl,
  setImageUrl,
  handleChange,
  handleNestedChange,
}: Props) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Name + Provider */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input
              id="name"
              value={agentConfig.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter agent name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modelProvider">Model Provider</Label>
            <Select
              value={agentConfig.modelProvider}
              onValueChange={(v) => handleChange("modelProvider", v)}
            >
              <SelectTrigger><SelectValue placeholder="Select model provider" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="mistral">Mistral AI</SelectItem>
                <SelectItem value="llama">Llama</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* System Prompt */}
        <div className="space-y-2">
          <Label htmlFor="system">System Prompt</Label>
          <Textarea
            id="system"
            value={agentConfig.system}
            onChange={(e) => handleChange("system", e.target.value)}
            placeholder="Enter system prompt"
            className="min-h-[150px]"
          />
        </div>
        {/* Voice Settings */}
        <div className="space-y-2">
          <Label>Voice Settings</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              value={agentConfig.settings.voice.model}
              onValueChange={(v) => handleNestedChange("settings", "voice", { model: v })}
            >
              <SelectTrigger><SelectValue placeholder="Select voice model" /></SelectTrigger>
              <SelectContent>
                {![
                  "en_US-male-medium",
                  "en_US-female-medium",
                  "en_UK-male-medium",
                  "en_UK-female-medium",
                ].includes(agentConfig.settings.voice.model) && (
                  <SelectItem value={agentConfig.settings.voice.model}>
                    {agentConfig.settings.voice.model}
                  </SelectItem>
                )}
                <SelectItem value="en_US-male-medium">US Male (Medium)</SelectItem>
                <SelectItem value="en_US-female-medium">US Female (Medium)</SelectItem>
                <SelectItem value="en_UK-male-medium">UK Male (Medium)</SelectItem>
                <SelectItem value="en_UK-female-medium">UK Female (Medium)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Image URL */}
        <div className="space-y-2">
          <div className="flex items-center">
            <Label htmlFor="imageUrl">Agent Image URL</Label>
            <span className="text-xs text-gray-500 ml-2">(Optional)</span>
          </div>
          <Input
            id="imageUrl"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Enter URL for agent image"
          />
          {imageUrl && (
            <div className="mt-2 border rounded-md p-2 max-w-xs">
              <img
                src={imageUrl}
                alt="Agent preview"
                className="max-h-32 object-contain mx-auto"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg?height=128&width=128";
                  e.currentTarget.alt = "Invalid image URL";
                }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
