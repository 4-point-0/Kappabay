"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import PluginSelector from "@/components/plugin-selector";

interface Props {
  agentConfig: any;
  onPluginChange: (plugins: any[]) => void;
  onEnvChange: (env: Record<string, string>) => void;
}
export default function PluginsTab({ agentConfig, onPluginChange, onEnvChange }: Props) {
  return (
    <Card>
      <CardContent className="pt-6">
        <PluginSelector
          agentConfig={agentConfig}
          onPluginChange={onPluginChange}
          onEnvChange={onEnvChange}
        />
      </CardContent>
    </Card>
  );
}
