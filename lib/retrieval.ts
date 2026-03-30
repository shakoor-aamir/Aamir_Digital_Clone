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
  "role",
  "title",
  "education",
  "certification",
  "where",
  "when",
  "timeline",
  "tools",
  "experience with",
  "background in",
  "career",
  "history"
] as const;

const FACTUAL_SECTION_TITLES = [
  "career timeline",
  "major companies",
  "professional summary",
  "education",
  "certifications & continuous learning",
  "tools & standards",
  "domain expertise"
] as const;

const PRIORITY_SECTION_TITLES = [
  "career timeline",
  "major companies",
  "domain expertise",
  "tools & standards",
  "leadership examples",
  "certifications & continuous learning",
  "ai projects & experiments",
  "education"
] as const;

const JD_PRIORITY_PHRASES = [
  "carweaver",
  "carcom",
  "elektra",
  "diagnostics",
  "volvo",
  "requirements",
  "autosar",
  "supplier",
  "steering",
  "microservices",
  "java",
  "react",
  "docker",
  "backend",
  "frontend",
  "embedded linux",
  "system safety",
  "cybersecurity",
  "fmea",
  "roadmap",
  "stakeholder alignment",
  "stakeholder",
  "backlog",
  "prioritization",
  "product strategy",
  "product manager",
  "product owner",
  "customer",
  "salesforce",
  "platform",
  "delivery",
  "cross-functional",
  "market research",
  "competitive benchmarking",
  "user interviews",
  "usage analytics",
  "feature prioritization",
  "go-to-market",
  "end-to-end ownership",
  "ai",
  "ai-first",
  "ai-driven",
  "machine learning",
  "llm",
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
  "new product opportunities",
  "ownership",
  "architecture",
  "system design",
  "embedded",
  "agile"
] as const;

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
] as const;

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
] as const;

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
] as const;

const EMBEDDED_FILTER_TERMS = ["ai", "ai-driven", "product strategy"] as const;
const EMBEDDED_DEPRIORITIZE_TERMS = ["senior product manager"] as const;
const EMBEDDED_PRIORITY_TERMS = [
  "requirements",
  "carweaver",
  "carcom",
  "elektra",
  "systemweaver"
] as const;

const TECHNICAL_ANCHOR_TERMS = [
  "embedded systems",
  "requirements",
  "requirements engineering",
  "diagnostics",
  "carweaver",
  "carcom",
  "elektra",
  "systemweaver",
  "autosar",
  "ecu",
  "supplier",
  "verification",
  "canoe",
  "trace32",
  "iso 26262",
  "aspice",
  "system architecture"
] as const;

const PRODUCT_ANCHOR_TERMS = [
  "product manager",
  "product owner",
  "product strategy",
  "roadmap",
  "backlog",
  "prioritization",
  "stakeholder",
  "cross-functional",
  "delivery",
  "kpis",
  "product lifecycle",
  "customer",
  "platform",
  "market research",
  "competitive benchmarking",
  "user interviews",
  "usage analytics",
  "feature prioritization",
  "go-to-market",
  "end-to-end ownership"
] as const;

const AI_PRODUCT_ANCHOR_TERMS = [
  "ai",
  "ai-driven",
  "ai product strategy",
  "ai projects & experiments",
  "experimentation",
  "prompt design",
  "grounding",
  "evaluation",
  "product concepts",
  "decision-support",
  "product strategy",
  "roadmap",
  "ownership",
  "platform",
  "cross-functional",
  "leadership",
  "ideation",
  "validation",
  "concept to delivery"
] as const;

const LOW_LEVEL_TECHNICAL_TOOL_TERMS = [
  "canoe",
  "trace32",
  "low-level debugging",
  "hal",
  "cortex-m3",
  "jtag"
] as const;

const GENERIC_SECTION_HINTS = [
  "professional summary",
  "preferred markets / roles",
  "leadership style",
  "why should we hire you",
  "closing statement"
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

type RoleMode = "embedded" | "product" | "ai-product" | "general";

interface ScoreResult {
  score: number;
  reasons: string[];
}

interface ScoredSection extends RetrievalSection {
  reasons: string[];
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s/+.-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function normalizeForMatching(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s/+.-]/g, " ");
}

function normalizeDashVariants(input: string): string {
  return input.replace(/[–—]/g, "-");
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
  const normalizedDashes = normalizeDashVariants(question.toLowerCase());
  const hasYear = /\b(19|20)\d{2}\b/.test(normalized);
  const hasYearRange = /\b(19|20)\d{2}\s*-\s*(19|20)\d{2}\b/.test(normalizedDashes);
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
      signalScores.set(phrase, matches.length * 8);
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
    .slice(0, 14)
    .map(([signal]) => signal);
}

function countSignalMatches(haystack: string, signals: readonly string[]): number {
  return signals.filter((signal) => haystack.includes(signal)).length;
}

function detectRoleMode(
  roleTarget: RoleTarget,
  jobDescriptionSignals: string[],
  jobDescription?: string
): {
  isEmbeddedRole: boolean;
  isProductRole: boolean;
  isAIProductRole: boolean;
  roleMode: RoleMode;
} {
  const normalizedRoleTarget = normalizeForMatching(roleTarget);
  const normalizedJobDescription = normalizeForMatching(jobDescription || "");
  const embeddedScore =
    countSignalMatches(normalizedRoleTarget, EMBEDDED_ROLE_KEYWORDS) * 3 +
    countSignalMatches(normalizedJobDescription, EMBEDDED_ROLE_KEYWORDS) * 2 +
    countSignalMatches(jobDescriptionSignals.join(" "), EMBEDDED_ROLE_KEYWORDS);
  const productScore =
    (roleTarget === "Product Manager" || roleTarget === "Product Owner" ? 5 : 0) +
    countSignalMatches(normalizedRoleTarget, PRODUCT_ROLE_KEYWORDS) * 3 +
    countSignalMatches(normalizedJobDescription, PRODUCT_ROLE_KEYWORDS) * 2 +
    countSignalMatches(jobDescriptionSignals.join(" "), PRODUCT_ROLE_KEYWORDS);
  const aiProductScore =
    (roleTarget === "AI Product Manager" ? 6 : 0) +
    countSignalMatches(normalizedJobDescription, AI_PRODUCT_ROLE_KEYWORDS) * 3 +
    countSignalMatches(jobDescriptionSignals.join(" "), AI_PRODUCT_ROLE_KEYWORDS) * 2;

  const isAIProductRole = aiProductScore >= 4 && aiProductScore >= embeddedScore;
  const isEmbeddedRole =
    !isAIProductRole &&
    embeddedScore >= 3 &&
    embeddedScore > productScore;
  const isProductRole =
    !isEmbeddedRole &&
    (isAIProductRole || productScore >= 3 || roleTarget === "Product Manager" || roleTarget === "Product Owner");
  const roleMode: RoleMode = isAIProductRole
    ? "ai-product"
    : isEmbeddedRole
      ? "embedded"
      : isProductRole
        ? "product"
        : "general";

  return {
    isEmbeddedRole,
    isProductRole,
    isAIProductRole,
    roleMode
  };
}

function neutralizeIdentityForTechnicalRoles(text: string): string {
  return text
    .replace(/Senior Product Manager/g, "automotive embedded systems professional")
    .replace(/Product Manager/g, "embedded systems professional")
    .replace(/Product Owner/g, "engineering-focused delivery role")
    .replace(/\bleader\b/g, "professional");
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

function addReason(reasons: string[], label: string, points: number) {
  reasons.push(`${label} (+${points})`);
}

function addPenalty(reasons: string[], label: string, points: number) {
  reasons.push(`${label} (-${points})`);
}

function countExactKeywordMatches(haystackTokens: Set<string>, tokens: string[]): number {
  let count = 0;

  for (const token of tokens) {
    if (haystackTokens.has(token)) {
      count += 1;
    }
  }

  return count;
}

function countExactPhraseMatches(haystack: string, phrases: string[]): string[] {
  return phrases.filter((phrase) => phrase.includes(" ") && haystack.includes(phrase));
}

function buildQuestionPhrases(question: string): string[] {
  const normalized = normalizeForMatching(question).trim();

  if (!normalized) {
    return [];
  }

  const phrases = [normalized];
  const keywordPhrases = FACTUAL_KEYWORDS.filter((keyword) => normalized.includes(keyword));

  for (const phrase of keywordPhrases) {
    phrases.push(phrase);
  }

  return Array.from(new Set(phrases));
}

function scoreSection(
  section: RetrievalSection,
  queryTokens: string[],
  questionPhrases: string[],
  roleTarget: RoleTarget,
  factualQuestion: boolean,
  jobDescriptionSignals: string[],
  roleMode: RoleMode
): ScoreResult {
  const sectionText = `${section.title} ${section.content}`;
  const normalizedSectionText = normalizeForMatching(sectionText);
  const normalizedTitle = section.title.toLowerCase();
  const tokenSet = new Set(tokenize(sectionText));
  const reasons: string[] = [];
  let score = 0;

  const questionKeywordMatches = countExactKeywordMatches(tokenSet, queryTokens);
  if (questionKeywordMatches > 0) {
    const points = questionKeywordMatches * 3;
    score += points;
    addReason(reasons, `exact question keywords x${questionKeywordMatches}`, points);
  }

  const matchedQuestionPhrases = countExactPhraseMatches(
    normalizedSectionText,
    questionPhrases
  );
  if (matchedQuestionPhrases.length > 0) {
    const points = matchedQuestionPhrases.length * 10;
    score += points;
    matchedQuestionPhrases.forEach((phrase) =>
      addReason(reasons, `exact question phrase: ${phrase}`, 10)
    );
  }

  const matchedRoleHints = ROLE_HINTS[roleTarget].filter((hint) => tokenSet.has(hint));
  if (matchedRoleHints.length > 0) {
    const points = matchedRoleHints.length * 2;
    score += points;
    addReason(reasons, `role-target hints x${matchedRoleHints.length}`, points);
  }

  if (section.source === "master_profile.md") {
    score += 8;
    addReason(reasons, "source priority: master_profile", 8);
  } else if (section.source === "interview_answer_bank.md") {
    score += 3;
    addReason(reasons, "source priority: answer_bank", 3);
  } else if (section.source === "answer_styles.md") {
    score -= 4;
    addPenalty(reasons, "low-priority source: answer_styles", 4);
  } else if (section.source === "red_lines.md") {
    score -= 3;
    addPenalty(reasons, "low-priority source: red_lines", 3);
  }

  if (
    PRIORITY_SECTION_TITLES.includes(
      normalizedTitle as (typeof PRIORITY_SECTION_TITLES)[number]
    )
  ) {
    score += 6;
    addReason(reasons, `section priority: ${normalizedTitle}`, 6);
  }

  if (
    FACTUAL_SECTION_TITLES.includes(
      normalizedTitle as (typeof FACTUAL_SECTION_TITLES)[number]
    )
  ) {
    score += 4;
    addReason(reasons, `factual section: ${normalizedTitle}`, 4);
  }

  if (section.source === "master_profile.md") {
    score += 3;
    addReason(reasons, "label signal: [Source: master_profile.md]", 3);
    score += 2;
    addReason(reasons, "label signal: [Section: ...]", 2);
    score += 2;
    addReason(reasons, "label signal: [Experience area: ...]", 2);
  }

  if (factualQuestion) {
    if (section.source === "master_profile.md") {
      score += 14;
      addReason(reasons, "factual question boost: master_profile", 14);
    }

    if (
      normalizedTitle.includes("career timeline") ||
      normalizedTitle.includes("major companies") ||
      normalizedTitle.includes("education") ||
      normalizedTitle.includes("certifications")
    ) {
      score += 12;
      addReason(reasons, `factual question boost: ${normalizedTitle}`, 12);
    }

    if (
      section.source === "interview_answer_bank.md" &&
      !normalizedTitle.includes("tell me about yourself")
    ) {
      score -= 5;
      addPenalty(reasons, "factual question penalty: generic answer bank", 5);
    }
  }

  let jdExactMatchCount = 0;
  if (jobDescriptionSignals.length > 0) {
    for (const signal of jobDescriptionSignals) {
      if (signal.includes(" ")) {
        if (normalizedSectionText.includes(signal)) {
          jdExactMatchCount += 1;
          score += 9;
          addReason(reasons, `exact JD phrase: ${signal}`, 9);
        }
      } else if (tokenSet.has(signal)) {
        jdExactMatchCount += 1;
        score += 7;
        addReason(reasons, `exact JD keyword: ${signal}`, 7);
      }
    }

    if (section.source === "master_profile.md" && jdExactMatchCount > 0) {
      const points = jdExactMatchCount * 2;
      score += points;
      addReason(reasons, "JD match on trusted source", points);
    }
  }

  if (roleMode === "embedded") {
    let technicalAnchorMatches = 0;
    for (const term of TECHNICAL_ANCHOR_TERMS) {
      if (normalizedSectionText.includes(term)) {
        technicalAnchorMatches += 1;
        score += 5;
        addReason(reasons, `technical anchor: ${term}`, 5);
      }
    }

    if (technicalAnchorMatches > 1) {
      const stackedAnchorBonus = technicalAnchorMatches * 2;
      score += stackedAnchorBonus;
      addReason(reasons, "technical anchor stacking", stackedAnchorBonus);
    }

    for (const term of [
      "product manager",
      "product strategy",
      "roadmap",
      "ai",
      "ai-driven",
      "leadership"
    ]) {
      if (normalizedSectionText.includes(term)) {
        const penalty = term === "ai" || term === "ai-driven" ? 7 : 4;
        score -= penalty;
        addPenalty(reasons, `embedded-role identity penalty: ${term}`, penalty);
      }
    }
  }

  if (roleMode === "product" || roleMode === "ai-product") {
    let productAnchorMatches = 0;
    for (const term of PRODUCT_ANCHOR_TERMS) {
      if (normalizedSectionText.includes(term)) {
        productAnchorMatches += 1;
        const points = term === "product manager" || term === "product owner" ? 6 : 5;
        score += points;
        addReason(reasons, `product anchor: ${term}`, points);
      }
    }

    if (productAnchorMatches > 1) {
      const stackedProductBonus = productAnchorMatches * 2;
      score += stackedProductBonus;
      addReason(reasons, "product anchor stacking", stackedProductBonus);
    }

    for (const term of LOW_LEVEL_TECHNICAL_TOOL_TERMS) {
      if (normalizedSectionText.includes(term)) {
        score -= 3;
        addPenalty(reasons, `product-role low-level tool penalty: ${term}`, 3);
      }
    }
  }

  if (roleMode === "ai-product") {
    let aiProductAnchorMatches = 0;
    for (const term of AI_PRODUCT_ANCHOR_TERMS) {
      if (normalizedSectionText.includes(term)) {
        aiProductAnchorMatches += 1;
        score += 6;
        addReason(reasons, `ai-product anchor: ${term}`, 6);
      }
    }

    if (aiProductAnchorMatches > 1) {
      const stackedAiBonus = aiProductAnchorMatches * 2;
      score += stackedAiBonus;
      addReason(reasons, "ai-product anchor stacking", stackedAiBonus);
    }

    for (const term of [
      "low-level debugging",
      "cortex-m3",
      "jtag",
      "embedded systems engineer",
      "research associate"
    ]) {
      if (normalizedSectionText.includes(term)) {
        score -= 4;
        addPenalty(reasons, `ai-product opening penalty: ${term}`, 4);
      }
    }
  }

  const genericPenaltyApplies =
    GENERIC_SECTION_HINTS.some((hint) => normalizedTitle.includes(hint)) &&
    (questionKeywordMatches > 0 || jdExactMatchCount > 0 || factualQuestion);
  if (genericPenaltyApplies) {
    score -= 6;
    addPenalty(reasons, "generic summary penalty", 6);
  }

  if (roleMode !== "ai-product") {
    const aiPenaltyApplies =
      !jobDescriptionSignals.some((signal) =>
        ["ai", "llm", "machine learning", "experimentation"].includes(signal)
      ) &&
      (normalizedTitle.includes("ai projects") || normalizedSectionText.includes("llm")) &&
      jobDescriptionSignals.length > 0;
    if (aiPenaltyApplies) {
      score -= 5;
      addPenalty(reasons, "AI mismatch penalty", 5);
    }
  }

  return {
    score,
    reasons
  };
}

function applyRoleFiltering(sections: ScoredSection[], roleMode: RoleMode): {
  filtered: ScoredSection[];
  filteredOut: ScoredSection[];
  suppressedReasons: string[];
} {
  const filteredOut: ScoredSection[] = [];
  const suppressedReasons: string[] = [];

  const filtered = sections
    .filter((section) => {
      const normalizedSectionText = normalizeForMatching(
        `${section.title} ${section.content}`
      );

      if (roleMode === "embedded") {
        const shouldFilterOut = EMBEDDED_FILTER_TERMS.some((term) =>
          normalizedSectionText.includes(term)
        );

        if (shouldFilterOut) {
          const reason = "embedded-role filter: removed AI/product-strategy chunk";
          section.reasons.push(reason);
          filteredOut.push(section);
          suppressedReasons.push(reason);
          return false;
        }
      }

      return true;
    })
    .map((section) => {
      const normalizedSectionText = normalizeForMatching(
        `${section.title} ${section.content}`
      );

      if (roleMode === "embedded") {
        for (const term of EMBEDDED_DEPRIORITIZE_TERMS) {
          if (normalizedSectionText.includes(term)) {
            section.score -= 8;
            section.reasons.push(`embedded-role de-prioritize: ${term} (-8)`);
            suppressedReasons.push(`embedded-role de-prioritize: ${term}`);
          }
        }

        let priorityMatches = 0;
        for (const term of EMBEDDED_PRIORITY_TERMS) {
          if (normalizedSectionText.includes(term)) {
            priorityMatches += 1;
            section.score += 8;
            section.reasons.push(`embedded-role priority: ${term} (+8)`);
          }
        }

        if (priorityMatches > 1) {
          const stackedBonus = priorityMatches * 2;
          section.score += stackedBonus;
          section.reasons.push(`embedded-role stacked priority bonus (+${stackedBonus})`);
        }
      }

      if (roleMode === "product") {
        if (
          normalizedSectionText.includes("embedded systems engineer") ||
          normalizedSectionText.includes("research associate")
        ) {
          section.score -= 5;
          section.reasons.push("product-role suppression: early embedded opening (-5)");
          suppressedReasons.push("product-role suppression: early embedded opening");
        }
      }

      if (roleMode === "ai-product") {
        if (
          normalizedSectionText.includes("embedded systems engineer") ||
          normalizedSectionText.includes("research associate")
        ) {
          section.score -= 6;
          section.reasons.push("ai-product suppression: embedded-first opening (-6)");
          suppressedReasons.push("ai-product suppression: embedded-first opening");
        }
      }

      return section;
    })
    .sort((a, b) => b.score - a.score);

  return {
    filtered,
    filteredOut,
    suppressedReasons
  };
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
  const routing = detectRoleMode(roleTarget, jobDescriptionSignals, jobDescription);
  console.log("FACTUAL PROFILE QUESTION:", factualQuestion);
  console.log("JOB DESCRIPTION PROVIDED:", jobDescriptionProvided);
  console.log("JOB DESCRIPTION SIGNALS:", jobDescriptionSignals);
  console.log("ROLE ROUTING:");
  console.log("- isEmbeddedRole:", routing.isEmbeddedRole);
  console.log("- isProductRole:", routing.isProductRole);
  console.log("- isAIProductRole:", routing.isAIProductRole);
  console.log("ROLE TYPE:", routing.roleMode);

  const queryTokens = tokenize(`${question} ${roleTarget}`);
  const questionPhrases = buildQuestionPhrases(question);
  const allSections = await loadSections();

  const baselineRankedIds = allSections
    .map((section) => {
      const scored = scoreSection(
        section,
        queryTokens,
        questionPhrases,
        roleTarget,
        factualQuestion,
        [],
        routing.roleMode
      );

      return {
        ...section,
        score: scored.score,
        reasons: scored.reasons
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, factualQuestion ? 3 : 6)
    .map((section) => section.id)
    .join("|");

  const ranked: ScoredSection[] = allSections
    .map((section) => {
      const scored = scoreSection(
        section,
        queryTokens,
        questionPhrases,
        roleTarget,
        factualQuestion,
        jobDescriptionSignals,
        routing.roleMode
      );

      return {
        ...section,
        score: scored.score,
        reasons: scored.reasons
      };
    })
    .sort((a, b) => b.score - a.score);

  const { filtered, filteredOut, suppressedReasons } = applyRoleFiltering(
    ranked,
    routing.roleMode
  );

  const selected = filtered
    .filter((section, index) => section.score > 0 || index < 5)
    .slice(0, factualQuestion ? 3 : 6);

  const promptReadySections = selected.map((section, index) => {
    if (routing.roleMode !== "embedded") {
      return section;
    }

    const neutralizedContent = neutralizeIdentityForTechnicalRoles(section.content);
    const changed = neutralizedContent !== section.content;

    if (changed) {
      console.log(
        `IDENTITY NEUTRALIZATION BEFORE [${index}]:`,
        section.content.slice(0, 200)
      );
      console.log(
        `IDENTITY NEUTRALIZATION AFTER [${index}]:`,
        neutralizedContent.slice(0, 200)
      );
    }

    return {
      ...section,
      content: neutralizedContent
    };
  });

  const rankingChangedBecauseOfJobDescription =
    jobDescriptionSignals.length > 0 &&
    baselineRankedIds !== promptReadySections.map((section) => section.id).join("|");

  const experienceAreas = Array.from(
    new Set(promptReadySections.map((section) => section.experienceArea))
  );

  console.log(
    "RETRIEVAL RANKING CHANGED BECAUSE OF JD:",
    rankingChangedBecauseOfJobDescription
  );
  console.log("IDENTITY NEUTRALIZATION APPLIED:", routing.roleMode === "embedded");
  console.log("FILTERED OUT CHUNKS:");
  filteredOut.forEach((section, index) => {
    console.log(
      `Filtered ${index}: ${section.source} | ${section.title} | Score: ${section.score}`
    );
  });
  console.log("FILTER SUMMARY:");
  console.log("- suppressed chunks count:", filteredOut.length);
  console.log(
    "- top suppressed reasons:",
    Array.from(new Set(suppressedReasons)).slice(0, 5)
  );
  console.log("- final selected chunks count:", promptReadySections.length);
  console.log("BOOSTED CHUNKS:");
  promptReadySections.forEach((section, index) => {
    const boostedReasons = section.reasons.filter(
      (reason) =>
        reason.includes("technical anchor") ||
        reason.includes("product anchor") ||
        reason.includes("ai-product anchor") ||
        reason.includes("exact JD") ||
        reason.includes("embedded-role priority") ||
        reason.includes("source priority")
    );
    if (boostedReasons.length > 0) {
      console.log(`Boosted ${index}: ${section.source} | ${section.title}`);
      boostedReasons.slice(0, 6).forEach((reason) => {
        console.log(`- ${reason}`);
      });
    }
  });
  console.log("FINAL SELECTED CHUNKS:");
  promptReadySections.forEach((section, index) => {
    console.log(`Final ${index}: ${section.source} | ${section.title} | Score: ${section.score}`);
  });
  console.log("RETRIEVED CHUNKS COUNT:", promptReadySections.length);
  promptReadySections.forEach((section, index) => {
    console.log(`CHUNK ${index}:`, section.content.slice(0, 200));
    console.log("RETRIEVAL SCORE:");
    console.log(`Chunk ${index}`);
    console.log(`Source: ${section.source}`);
    console.log(`Section: ${section.title}`);
    console.log(`Score: ${section.score}`);
    console.log("Reasons:");
    section.reasons.slice(0, 8).forEach((reason) => {
      console.log(`- ${reason}`);
    });
  });

  return {
    sections: promptReadySections.map(({ reasons: _reasons, ...section }) => section),
    experienceAreas,
    jobDescriptionSignals
  };
}
