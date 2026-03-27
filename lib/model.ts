import { AnswerResponse } from "@/lib/types";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4.1-mini";

function extractJson(raw: string): string {
  const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }

  return raw;
}

export async function generateAnswer({
  systemPrompt,
  userPrompt
}: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<AnswerResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const baseUrl = process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: {
        type: "json_object"
      },
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Model request failed: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const rawContent = payload.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error("Model returned an empty response.");
  }

  const parsed = JSON.parse(extractJson(rawContent)) as Partial<AnswerResponse>;

  if (!parsed.answer || !Array.isArray(parsed.experienceAreasUsed) || !parsed.supportNote) {
    throw new Error("Model returned malformed JSON.");
  }

  return {
    answer: parsed.answer,
    experienceAreasUsed: parsed.experienceAreasUsed.filter(Boolean),
    supportNote: parsed.supportNote
  };
}
