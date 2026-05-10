import "server-only";

import { GoogleGenAI, Type } from "@google/genai";

import { getGeminiApiKey, getGeminiModel } from "@/lib/config/env";

/** JSON schema for Gemini structured output — semantic lists only (no audio metrics). */
export const GEMINI_SEMANTIC_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  description:
    "Semantic descriptors only. Never include BPM, musical key, Camelot, energy, danceability, valence, or loudness.",
  properties: {
    moodTags: {
      type: Type.ARRAY,
      description: "Up to 5 short mood labels.",
      items: { type: Type.STRING },
      maxItems: "5",
    },
    themes: {
      type: Type.ARRAY,
      description: "Up to 5 thematic / narrative labels.",
      items: { type: Type.STRING },
      maxItems: "5",
    },
    lyricKeywords: {
      type: Type.ARRAY,
      description: "Up to 10 lyric motifs or keywords.",
      items: { type: Type.STRING },
      maxItems: "10",
    },
    semanticTags: {
      type: Type.ARRAY,
      description: "Up to 10 other concise semantic tags.",
      items: { type: Type.STRING },
      maxItems: "10",
    },
  },
  required: ["moodTags", "themes", "lyricKeywords", "semanticTags"],
};

export async function generateGeminiSemanticJson(args: {
  systemInstruction: string;
  userPrompt: string;
}): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: args.userPrompt,
    config: {
      systemInstruction: args.systemInstruction,
      responseMimeType: "application/json",
      responseSchema: GEMINI_SEMANTIC_RESPONSE_SCHEMA,
      temperature: 0.35,
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("[gemini] Empty response text");
  }
  return text;
}
