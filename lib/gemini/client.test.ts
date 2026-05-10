import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: '{"moodTags":["calm"],"themes":[],"lyricKeywords":[],"semanticTags":[]}',
      }),
    },
  })),
  Type: {
    OBJECT: "OBJECT",
    ARRAY: "ARRAY",
    STRING: "STRING",
  },
}));

vi.mock("@/lib/config/env", () => ({
  getGeminiApiKey: () => "test-key",
  getGeminiModel: () => "gemini-test-model",
}));

describe("generateGeminiSemanticJson", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("delegates to Gemini SDK and returns JSON text", async () => {
    const { generateGeminiSemanticJson } = await import("./client");
    const json = await generateGeminiSemanticJson({
      systemInstruction: "system",
      userPrompt: "user content",
    });
    expect(JSON.parse(json).moodTags).toEqual(["calm"]);
  });
});
