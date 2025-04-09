import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { AgentConfig } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function serializeAgentConfig(config: AgentConfig): string {
  return JSON.stringify(config, null, 2);
}

export function deserializeAgentConfig(jsonString: string): AgentConfig {
  return JSON.parse(jsonString) as AgentConfig;
}