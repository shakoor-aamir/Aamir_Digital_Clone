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

const JD_PRIORITY_PHRASES = [
  "roadmap",
  "stakeholder",
  "stakeholder alignment",
  "backlog",
  "prioritization",
  "product strategy",
  "ai",
  "machine learning",
  "llm",
  "experimentation",
  "architecture",
  "system design",
  "autosar",
  "diagnostics",
  "embedded",
  "cross-functional",
  "agile",
  "ownership",
  "requirements",
  "delivery",
  "platform",
  "safety"
] as const;

const STOPWORDS = new Set([
  "about",
  "across",
  "after",
  "also",
  "and",
  "are",
  "been",
  "being",
  "both",
  "build",
  "candidate",
  "collaborate",
  "deliver",
  "each",
  "from",
  "have",
  "into",
  "looking",
  "must",
  "need",
  "needs",
  "role",
  "team",
  "teams",
  "that",
  "their",
  "them",
  "they",
  "this",
  "will",
  "with",
  "work",
  "working",
  "would",
  "years",
  "your",
  "experience"
]);

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function normalizeForMatching(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s/-]/g, " ");
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
  const normalized = normalizeForMatching(question);
  const hasYear = /\b(19|20)\d{2}\b/.test(normalized);
  const hasYearRange = /\b(19|20)\d{2}\s*[–-]\s*(19|20)\d{2}\b/.test(question);
  const hasFactualKeyword = FACTUAL_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );

  return hasYear || hasYearRange || hasFactualKeyword;
}

function extractJobDescriptionSignals(jobDescription?: string): string[] {
  const normalized = normalizeForMatching(jobDescription || "");

  if (!normalized.trim()) {
    return [];
  }

  const signalScores = new Map<string, number>();

  for (const phrase of JD_PRIORITY_PHRASES) {
    const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = normalized.match(new RegExp(`\\b${escapedPhrase}\\b`, "g"));

    if (matches?.length) {
      signalScores.set(phrase, matches.length * 6);
    }
  }

  for (const token of tokenize(normalized)) {
    if (STOPWORDS.has(token)) {
      continue;
    }

    const current = signalScores.get(token) || 0;
    signalScores.set(token, current + 1);
  }

  return Array.from(signalScores.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([signal]) => signal);
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
  factualQuestion: boolean,
  jobDescriptionSignals: string[]
): number {
  const sectionTokens = tokenize(`${section.title} ${section.content}`);
  const tokenSet = new Set(sectionTokens);
  const normalizedTitle = section.title.toLowerCase();
  const normalizedSectionText = normalizeForMatching(
    `${section.title} ${section.content}`
  );
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

  if (section.source === "answer_styles.md" || section.source === "interview_answer_bank.md") {
    score -= 1;
  }

  if (factualQuestion) {
    if (section.source === "master_profile.md") {
      score += 18;
    }

    if (
      FACTUAL_SECTION_TITLES.includes(
        normalizedTitle as (typeof FACTUAL_SECTION_TITLES)[number]
      )
    ) {
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

  if (jobDescriptionSignals.length > 0) {
    let jdMatchScore = 0;

    for (const signal of jobDescriptionSignals) {
      if (signal.includes(" ")) {
        if (normalizedSectionText.includes(signal)) {
          jdMatchScore += 5;
        }
      } else if (tokenSet.has(signal)) {
        jdMatchScore += 4;
      }
    }

    if (section.source === "master_profile.md") {
      score += jdMatchScore * 2;
    } else {
      score += jdMatchScore;
    }

    if (
      jdMatchScore === 0 &&
      (section.source === "answer_styles.md" || section.source === "interview_answer_bank.md")
    ) {
      score -= 4;
    }
  }

  return score;
}

export async function retrieveRelevantContext(
  question: string,
  roleTarget: RoleTarget,
  jobDescription?: string
): Promise<RetrievalResult> {
  console.log("USER QUESTION:", question);
  const factualQuestion = isFactualProfileQuestion(question);
  const jobDescriptionProvided = Boolean(jobDescription?.trim());
  const jobDescriptionSignals = extractJobDescriptionSignals(jobDescription);
  console.log("FACTUAL PROFILE QUESTION:", factualQuestion);
  console.log("JOB DESCRIPTION PROVIDED:", jobDescriptionProvided);
  console.log("JOB DESCRIPTION SIGNALS:", jobDescriptionSignals);
  const queryTokens = tokenize(`${question} ${roleTarget}`);
  const allSections = await loadSections();
  const baselineRankedIds = allSections
    .map((section) => ({
      ...section,
      score: scoreSection(section, queryTokens, roleTarget, factualQuestion, [])
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, factualQuestion ? 3 : 6)
    .map((section) => section.id)
    .join("|");

  const ranked = allSections
    .map((section) => ({
      ...section,
      score: scoreSection(
        section,
        queryTokens,
        roleTarget,
        factualQuestion,
        jobDescriptionSignals
      )
    }))
    .sort((a, b) => b.score - a.score);

  const selected = ranked
    .filter((section, index) => section.score > 0 || index < 5)
    .slice(0, factualQuestion ? 3 : 6);
  const rankingChangedBecauseOfJobDescription =
    jobDescriptionSignals.length > 0 &&
    baselineRankedIds !== selected.map((section) => section.id).join("|");

  const experienceAreas = Array.from(
    new Set(selected.map((section) => section.experienceArea))
  );

  console.log(
    "RETRIEVAL RANKING CHANGED BECAUSE OF JD:",
    rankingChangedBecauseOfJobDescription
  );
  console.log("RETRIEVED CHUNKS COUNT:", selected.length);
  selected.forEach((section, index) => {
    console.log(`CHUNK ${index}:`, section.content.slice(0, 200));
  });

  return {
    sections: selected,
    experienceAreas,
    jobDescriptionSignals
  };
}
