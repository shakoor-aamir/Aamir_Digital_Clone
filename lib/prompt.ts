import fs from "node:fs/promises";
import path from "node:path";
import { AnswerMode, RetrievalSection, RoleTarget } from "@/lib/types";
import { detectRoleMode } from "@/lib/rag";

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
        `[Role tags: ${(section.roleTags || []).join(", ") || "none"}]`,
        `[Domain tags: ${(section.domainTags || []).join(", ") || "none"}]`,
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
  const roleMode = detectRoleMode(roleTarget, jobDescriptionSignals).roleMode;
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
              "Start from product ownership, execution, experimentation, and hands-on building.",
              "The first sentence should reflect current product responsibility and operator mindset.",
              "Do not begin with embedded engineering background.",
              'Do not begin with "I come from..." or "I started my career..."',
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

  const aiBuildingHintSection =
    roleMode === "ai-product"
      ? [
          "AI PRODUCT EMPHASIS:",
          "Include at least one concrete example of building, prototyping, experimenting, or validating an AI-enabled product or workflow when supported by the profile.",
          "Frame AI as practical experimentation, not passive interest.",
          "Mention trade-offs or system considerations when relevant, such as grounding, retrieval quality, accuracy, latency, or human oversight."
        ].join("\n")
      : "";

  const aiConcreteExampleRuleSection =
    roleMode === "ai-product"
      ? [
          "AI PRODUCT CONCRETE EXAMPLE RULE:",
          "Include at least one specific example of an AI-enabled system, prototype, experiment, or workflow if supported by the retrieved context.",
          'Generic phrases like "AI-powered product concepts" or "LLM-based systems" are not sufficient on their own.',
          "Prefer a clearly described example such as a grounded interview agent, retrieval-based workflow, decision-support workflow, or LLM-based prototype with grounding, evaluation, or trade-offs.",
          "If no concrete AI example is available, fall back to the strongest adjacent product or system experimentation evidence."
        ].join("\n")
      : "";

  const executionLoopHintSection =
    roleMode === "ai-product"
      ? [
          "EXECUTION LOOP HINT:",
          "For AI-product roles, reflect a practical loop such as idea to prototype to iterate to validate to refine when supported by context."
        ].join("\n")
      : "";

  const ecosystemHintSection =
    roleMode === "ai-product" && jobDescriptionSignals.includes("ecosystem")
      ? [
          "ECOSYSTEM HINT:",
          "Reflect system-level integration thinking rather than isolated feature thinking."
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
              "FINAL VALIDATION FOR AI-PRODUCT:",
              "Before returning the answer, verify:",
              "1. Does it open from product ownership or execution?",
              "2. Does it include one concrete AI example if supported?",
              "3. Does it frame AI as practical and iterative, not passive?",
              "4. Does it reflect ownership, experimentation, or iteration?",
              jobDescriptionSignals.includes("ecosystem")
                ? "5. If the JD stresses ecosystem, does it reflect system-level integration thinking?"
                : "5. Keep system-level integration thinking when relevant.",
              "The answer is invalid if it opens with automotive or embedded identity, presents AI as vague interest only, fails to include a concrete AI building or experimentation example when one exists in context, or does not emphasize ownership, execution, experimentation, or autonomy.",
              "If any check fails, rewrite internally before returning."
            ].join("\n")
          : "";

    console.log(
      "OPENING HINT APPLIED:",
      roleMode === "general" ? "none" : roleMode
    );
    console.log("SUPPRESSION HINT APPLIED:", roleMode === "general" ? "none" : roleMode);
    console.log("AI BUILDING HINT APPLIED:", roleMode === "ai-product");
    console.log("AI CONCRETE EXAMPLE RULE APPLIED:", roleMode === "ai-product");
    console.log("AI OPENING HINT APPLIED:", roleMode === "ai-product");
    console.log("EXECUTION LOOP HINT APPLIED:", roleMode === "ai-product");
    console.log("ECOSYSTEM HINT APPLIED:", Boolean(ecosystemHintSection));

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
      aiBuildingHintSection,
      aiBuildingHintSection ? "" : "",
      aiConcreteExampleRuleSection,
      aiConcreteExampleRuleSection ? "" : "",
      executionLoopHintSection,
      executionLoopHintSection ? "" : "",
      ecosystemHintSection,
      ecosystemHintSection ? "" : "",
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
