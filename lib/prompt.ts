import fs from "node:fs/promises";
import path from "node:path";
import { AnswerMode, RetrievalSection, RoleTarget } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");

const EMBEDDED_ROLE_KEYWORDS = [
  "embedded",
  "ecu",
  "autosar",
  "diagnostics",
  "carweaver",
  "carcom",
  "elektra",
  "requirements",
  "system architecture",
  "supplier",
  "verification",
  "canoe",
  "trace32",
  "steering"
];

const PRODUCT_ROLE_KEYWORDS = [
  "product manager",
  "product owner",
  "roadmap",
  "backlog",
  "customer",
  "stakeholder",
  "platform",
  "delivery",
  "product strategy",
  "cross-functional"
];

const AI_PRODUCT_ROLE_KEYWORDS = [
  "ai",
  "ai-first",
  "prototype",
  "prototyping",
  "experiment",
  "experimentation",
  "ideation",
  "startup",
  "scale-up",
  "ecosystem",
  "concept to launch",
  "independently lead",
  "autonomous",
  "new product opportunities"
];

type RoleMode = "embedded" | "product" | "ai-product" | "general";

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

function normalizeForMatching(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s/+.-]/g, " ");
}

function countSignalMatches(haystack: string, signals: readonly string[]): number {
  return signals.filter((signal) => haystack.includes(signal)).length;
}

function detectPromptRoleMode(
  roleTarget: RoleTarget,
  jobDescriptionSignals: string[]
): RoleMode {
  const normalizedRoleTarget = normalizeForMatching(roleTarget);
  const signalsText = jobDescriptionSignals.join(" ");
  const embeddedScore =
    countSignalMatches(normalizedRoleTarget, EMBEDDED_ROLE_KEYWORDS) * 3 +
    countSignalMatches(signalsText, EMBEDDED_ROLE_KEYWORDS) * 2;
  const productScore =
    (roleTarget === "Product Manager" || roleTarget === "Product Owner" ? 5 : 0) +
    countSignalMatches(normalizedRoleTarget, PRODUCT_ROLE_KEYWORDS) * 3 +
    countSignalMatches(signalsText, PRODUCT_ROLE_KEYWORDS) * 2;
  const aiProductScore =
    (roleTarget === "AI Product Manager" ? 6 : 0) +
    countSignalMatches(signalsText, AI_PRODUCT_ROLE_KEYWORDS) * 3;

  if (aiProductScore >= 4 && aiProductScore >= embeddedScore) {
    return "ai-product";
  }

  if (embeddedScore >= 3 && embeddedScore > productScore) {
    return "embedded";
  }

  if (productScore >= 3 || roleTarget === "Product Manager" || roleTarget === "Product Owner") {
    return "product";
  }

  return "general";
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
  sections,
  jobDescriptionSignals,
  jobDescriptionProvided
}: {
  question: string;
  answerMode: AnswerMode;
  roleTarget: RoleTarget;
  sections: RetrievalSection[];
  jobDescriptionSignals: string[];
  jobDescriptionProvided: boolean;
}): string {
  const roleMode = detectPromptRoleMode(roleTarget, jobDescriptionSignals);
  const jobDescriptionSection = jobDescriptionProvided
    ? [
        "JOB DESCRIPTION SIGNALS:",
        jobDescriptionSignals.length
          ? jobDescriptionSignals.map((signal) => `- ${signal}`).join("\n")
          : "- No strong job description themes were extracted."
      ].join("\n")
    : "JOB DESCRIPTION SIGNALS:\n- No job description was provided.";

  console.log("JOB DESCRIPTION PROMPT SECTION:", jobDescriptionSection);
  console.log("ROLE TYPE:", roleMode);

  const openingHintSection =
    roleMode === "embedded"
      ? [
          "OPENING SENTENCE HINT:",
          "Start from automotive embedded systems, requirements engineering, diagnostics, or system architecture.",
          "Do not begin with product-manager identity.",
          "Do not mention AI."
        ].join("\n")
      : roleMode === "product"
        ? [
            "OPENING SENTENCE HINT:",
            "Start from product ownership, roadmap responsibility, cross-functional delivery, or stakeholder alignment.",
            "Do not begin with early embedded engineering background."
          ].join("\n")
        : roleMode === "ai-product"
          ? [
              "OPENING SENTENCE HINT:",
              "Start from product ownership, end-to-end execution, ideation, experimentation, autonomy, and ecosystem thinking.",
              "Do not begin with embedded engineering background.",
              "If the JD explicitly includes AI-first work, AI experimentation or AI-enabled workflows may be mentioned when supported by the profile."
            ].join("\n")
          : "";

  const suppressionHintSection =
    roleMode === "embedded"
      ? [
          "SUPPRESSION HINT:",
          "Suppress AI and product-strategy identity. Product delivery evidence may be used only as supporting context."
        ].join("\n")
      : roleMode === "product"
        ? [
            "SUPPRESSION HINT:",
            "Suppress low-level engineering-first opening. Technical detail may support the answer but should not define the opening identity."
          ].join("\n")
        : roleMode === "ai-product"
          ? [
              "SUPPRESSION HINT:",
              "Suppress embedded-first opening unless it directly supports relevance. Keep the answer centered on ownership, execution, experimentation, and AI-enabled workflow orientation when supported."
            ].join("\n")
          : "";

  const validationHintSection =
    roleMode === "embedded"
      ? [
          "ROUTING VALIDATION HINT:",
          "The answer is invalid if it begins with product identity or includes AI."
        ].join("\n")
      : roleMode === "product"
        ? [
            "ROUTING VALIDATION HINT:",
            "The answer is invalid if it begins with early embedded engineering background."
          ].join("\n")
        : roleMode === "ai-product"
          ? [
              "ROUTING VALIDATION HINT:",
              "The answer is invalid if it does not emphasize ownership, execution, experimentation, or AI-enabled workflow orientation when supported by context."
            ].join("\n")
          : "";

  console.log(
    "OPENING HINT APPLIED:",
    roleMode === "general" ? "none" : roleMode
  );
  console.log(
    "SUPPRESSION HINT APPLIED:",
    roleMode === "general" ? "none" : roleMode
  );

  const userPrompt = [
    "Generate a supported interview answer from the retrieved profile context only.",
    `Answer mode: ${answerMode}`,
    `Role target: ${roleTarget}`,
    `Interview question: ${question}`,
    "",
    jobDescriptionSection,
    "",
    openingHintSection,
    openingHintSection ? "" : "",
    suppressionHintSection,
    suppressionHintSection ? "" : "",
    validationHintSection,
    validationHintSection ? "" : "",
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
