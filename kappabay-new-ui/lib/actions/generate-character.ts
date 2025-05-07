// app/actions/generateCharacter.ts
"use server";

import { z } from "zod";
import { OpenAI } from "openai";
import type { AgentConfig } from "@/lib/types"; // adjust this import path if needed

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CharacterSchema = z.object({
	description: z.string().min(10, "Please provide a longer character description."),
});

const AgentConfigSchema = z.object({
	name: z.string(),
	clients: z.array(z.string()),
	modelProvider: z.string(),
	system: z.string(),
	settings: z.object({
		voice: z.object({
			model: z.string(),
		}),
	}),
	plugins: z.array(z.any()),
	bio: z.array(z.string()),
	lore: z.array(z.string()),
	knowledge: z.array(z.string()),
	messageExamples: z.array(
		z.array(
			z.object({
				user: z.string(),
				content: z.object({ text: z.string() }),
			})
		)
	),
	postExamples: z.array(z.string()),
	topics: z.array(z.string()),
	style: z.object({
		all: z.array(z.string()),
		chat: z.array(z.string()),
		post: z.array(z.string()),
	}),
	adjectives: z.array(z.string()),
	appearance: z.object({
		hair: z.string().optional(),
		eyes: z.string().optional(),
		attire: z.string().optional(),
		setting: z.string().optional(),
		style: z.string().optional(),
	}),
	image: z.string().optional(),
});

function extractJsonFromMarkdown(markdown: string | null): string | null {
	if (!markdown) return null;
	// Remove the starting ```json and ending ```
	const jsonStart = markdown.indexOf("{");
	const jsonEnd = markdown.lastIndexOf("}") + 1;

	if (jsonStart === -1 || jsonEnd === 0) {
		return null;
	}

	return markdown.slice(jsonStart, jsonEnd);
}

export async function generateCharacter(formData: FormData): Promise<{ config?: AgentConfig; error?: any }> {
	const input = CharacterSchema.safeParse({
		description: formData.get("description"),
	});

	if (!input.success) {
		return {
			error: input.error.flatten().fieldErrors,
		};
	}

	const prompt = `You are a system that generates JSON configuration files for AI-powered characters used in a customizable agent UI. Based on the following user prompt, generate a complete JSON object for a character including personality, dialogue style, lore, example interactions, and visual appearance. Return ONLY valid JSON, no explanations or markdown.

Prompt: "${input.data.description}"

Template:
{
  "name": "<Character Name>",
  "clients": [],
  "modelProvider": "openai",
  "system": "<Character system role>",
  "settings": {
    "voice": {
      "model": "en_US-<voice-gender>-<tone>"
    }
  },
  "plugins": [],
  "bio": [<Short statements about character background>],
  "lore": [<World/life history>],
  "knowledge": [<Expertise areas>],
  "messageExamples": [[{ "user": "{{user1}}", "content": { "text": "<sample user message>" } }, { "user": "<characterId>", "content": { "text": "<sample reply>" } }]],
  "postExamples": [<Social media style posts>],
  "topics": [<Focus areas>],
  "style": {
    "all": [<General tone descriptors>],
    "chat": [<Chat-specific traits>],
    "post": [<Post-specific traits>]
  },
  "adjectives": [<Descriptive keywords>],
  "appearance": {
    "hair": "",
    "eyes": "",
    "attire": "",
    "setting": "",
    "style": ""
  }
}`;

	const completion = await openai.chat.completions.create({
		model: "gpt-4o",
		messages: [
			{
				role: "user",
				content: prompt,
			},
		],
		temperature: 0.8,
		max_tokens: 2000,
	});

	try {
		const raw = extractJsonFromMarkdown(completion.choices[0].message.content);

		const parsed = AgentConfigSchema.safeParse(JSON.parse(raw ?? ""));
		if (!parsed.success) {
			return {
				error: parsed.error.flatten().fieldErrors,
			};
		}
		const config: AgentConfig = parsed.data;
		return { config };
	} catch (err) {
		return {
			error: "Failed to parse JSON response from AI.",
		};
	}
}
