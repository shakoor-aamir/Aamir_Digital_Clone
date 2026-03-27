import fs from "node:fs/promises";
import path from "node:path";
import { RetrievalResult, RetrievalSection, RoleTarget } from "@/lib/types";

const DATA_FILES = [
  "master_profile.md",
  "answer_styles.md",
  "interview_answer_bank.md",
  "red_lines.md"
] as const;

const dataDir = path.join(process.cwd(), "data");

const ROLE_HINTS: Record<RoleTarget, string[]> = {
  "Product Manager": [
    "product",
    "roadmap",
    "prioritization",
    "stakeholder",
    "outcome"
  ],
  "Product Owner": [
    "backlog",
    "delivery",
    "requirements",
    "cross-functional",
    "execution"
  ],
  "System Architect": [
    "architecture",
    "system",
    "interfaces",
    "integration",
    "platform"
  ],
  "AI Product Manager": ["ai", "ml", "agent", "workflow", "experimentation"],
  "Embedded/Automotive leader": [
    "embedded",
    "automotive",
    "diagnostics",
    "autosar",
    "ecu"
  ]
};

const FACTUAL_KEYWORDS = [
  "company",
  "companies",
  "employer",
  "employers",
  "worked",
  "work history",
  "role",
  "title",
  "timeline",
  "career",
  "history"
] as const;

const FACTUAL_SECTION_TITLES = [
  "career timeline",
  "major companies",
  "professional summary"
] as const;

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function inferExperienceArea(source: string, title: string, content: string): string {
  const haystack = `${source} ${title} ${content}`.toLowerCase();

  if (
    haystack.includes("autosar") ||
    haystack.includes("diagnostic") ||
    haystack.includes("embedded")
  ) {
    return "Automotive embedded systems";
  }

  if (
    haystack.includes("architect") ||
    haystack.includes("system design") ||
    haystack.includes("integration")
  ) {
    return "Systems architecture";
  }

  if (
    haystack.includes("product") ||
    haystack.includes("roadmap") ||
    haystack.includes("stakeholder")
  ) {
    return "Product leadership";
  }

  if (
    haystack.includes("ai") ||
    haystack.includes("agent") ||
    haystack.includes("workflow")
  ) {
    return "AI product strategy";
  }

  return "Cross-functional delivery";
}

function isFactualProfileQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  const hasYear = /\b(19|20)\d{2}\b/.test(normalized);
  const hasYearRange = /\b(19|20)\d{2}\s*[–-]\s*(19|20)\d{2}\b/.test(normalized);
  const hasFactualKeyword = FACTUAL_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );

  return hasYear || hasYearRange || hasFactualKeyword;
}

function getExactTokenMatchCount(sectionTokens: Set<string>, queryTokens: string[]): number {
  let count = 0;

  for (const token of queryTokens) {
    if (sectionTokens.has(token)) {
      count += 1;
    }
  }

  return count;
}

function splitSections(source: string, markdown: string): RetrievalSection[] {
  const matches = Array.from(
    markdown.matchAll(/##\s+([^\n]+)\n([\s\S]*?)(?=\n##\s+|\s*$)/g)
  );

  return matches.map((match, index) => {
    const heading = match[1]?.trim() || `${source}-${index + 1}`;
    const content = match[2]?.trim() || "";
    const experienceArea = inferExperienceArea(source, heading, content);

    return {
      id: `${source}-${index + 1}`,
      title: heading,
      source,
      content,
      experienceArea,
      score: 0
    };
  });
}

async function loadSections(): Promise<RetrievalSection[]> {
  const docs = await Promise.all(
    DATA_FILES.map(async (fileName) => {
      const fullPath = path.join(dataDir, fileName);
      const exists = await fs
        .access(fullPath)
        .then(() => true)
        .catch(() => false);
      console.log("FILE CHECK:", fullPath, exists);
      const content = await fs.readFile(fullPath, "utf8");
      console.log("FILE LENGTH:", fullPath, content.length);
      return splitSections(fileName, content);
    })
  );

  return docs.flat();
}

function scoreSection(
  section: RetrievalSection,
  queryTokens: string[],
  roleTarget: RoleTarget,
  factualQuestion: boolean
): number {
  const sectionTokens = tokenize(`${section.title} ${section.content}`);
  const tokenSet = new Set(sectionTokens);
  const normalizedTitle = section.title.toLowerCase();
  const exactMatchCount = getExactTokenMatchCount(tokenSet, queryTokens);

  let score = 0;

  for (const token of queryTokens) {
    if (tokenSet.has(token)) {
      score += 3;
    }
  }

  for (const roleHint of ROLE_HINTS[roleTarget]) {
    if (tokenSet.has(roleHint)) {
      score += 2;
    }
  }

  if (section.source === "master_profile.md") {
    score += 2;
  }

  if (section.source === "red_lines.md") {
    score += 1;
  }

  if (factualQuestion) {
    if (section.source === "master_profile.md") {
      score += 18;
    }

    if (FACTUAL_SECTION_TITLES.includes(normalizedTitle as (typeof FACTUAL_SECTION_TITLES)[number])) {
      score += 24;
    }

    if (
      (section.source === "answer_styles.md" ||
        section.source === "interview_answer_bank.md") &&
      exactMatchCount < 2
    ) {
      score -= 12;
    }

    if (exactMatchCount > 0) {
      score += exactMatchCount * 4;
    }
  }

  return score;
}

export async function retrieveRelevantContext(
  question: string,
  roleTarget: RoleTarget
): Promise<RetrievalResult> {
  console.log("USER QUESTION:", question);
  const factualQuestion = isFactualProfileQuestion(question);
  console.log("FACTUAL PROFILE QUESTION:", factualQuestion);
  const queryTokens = tokenize(`${question} ${roleTarget}`);
  const allSections = await loadSections();

  const ranked = allSections
    .map((section) => ({
      ...section,
      score: scoreSection(section, queryTokens, roleTarget, factualQuestion)
    }))
    .sort((a, b) => b.score - a.score);

  const selected = ranked
    .filter((section, index) => section.score > 0 || index < 5)
    .slice(0, factualQuestion ? 3 : 6);

  const experienceAreas = Array.from(
    new Set(selected.map((section) => section.experienceArea))
  );

  console.log("RETRIEVED CHUNKS COUNT:", selected.length);
  selected.forEach((section, index) => {
    console.log(
      `CHUNK ${index}:`,
      section.content.slice(0, 200)
    );
  });

  return {
    sections: selected,
    experienceAreas
  };
}
