import fs from "node:fs/promises";
import path from "node:path";
import { AnswerMode, RetrievalSection, RoleTarget } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");

async function readDataFile(fileName: string): Promise<string> {
  const fullPath = path.join(dataDir, fileName);
  const exists = await fs
    .access(fullPath)
    .then(() => true)
    .catch(() => false);
  console.log("FILE CHECK:", fullPath, exists);
  const content = await fs.readFile(fullPath, "utf8");
  console.log("FILE LENGTH:", fullPath, content.length);
  return content;
}

export async function buildSystemPrompt(): Promise<string> {
  const [agentPrompt, masterProfile, answerStyles, redLines] = await Promise.all([
    readDataFile("interview_agent_prompt.md"),
    readDataFile("master_profile.md"),
    readDataFile("answer_styles.md"),
    readDataFile("red_lines.md")
  ]);

  const systemPrompt = [
    agentPrompt.trim(),
    "=== MASTER PROFILE ===",
    masterProfile.trim(),
    "=== ANSWER STYLES ===",
    answerStyles.trim(),
    "=== RED LINES ===",
    redLines.trim()
  ].join("\n\n");

  console.log("SYSTEM PROMPT LENGTH:", systemPrompt.length);

  return systemPrompt;
}

function formatSections(sections: RetrievalSection[]): string {
  return sections
    .map((section) =>
      [
        `[Source: ${section.source}]`,
        `[Section: ${section.title}]`,
        `[Experience area: ${section.experienceArea}]`,
        section.content
      ].join("\n")
    )
    .join("\n\n---\n\n");
}

export function buildUserPrompt({
  question,
  answerMode,
  roleTarget,
  sections
}: {
  question: string;
  answerMode: AnswerMode;
  roleTarget: RoleTarget;
  sections: RetrievalSection[];
}): string {
  const userPrompt = [
    "Generate a supported interview answer from the retrieved profile context only.",
    `Answer mode: ${answerMode}`,
    `Role target: ${roleTarget}`,
    `Interview question: ${question}`,
    "",
    "Retrieved context:",
    formatSections(sections),
    "",
    "Return JSON only with this exact shape:",
    "{",
    '  "answer": "final answer text",',
    '  "experienceAreasUsed": ["experience area"],',
    '  "supportNote": "support statement"',
    "}"
  ].join("\n");

  console.log("USER PROMPT LENGTH:", userPrompt.length);

  return userPrompt;
}
