import { RoleMode, RoleTarget } from "@/lib/types";

export const EMBEDDED_ROLE_KEYWORDS = [
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

export const PRODUCT_ROLE_KEYWORDS = [
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

export const AI_PRODUCT_ROLE_KEYWORDS = [
  "ai",
  "ai-first",
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
  "workflows",
  "decision support",
  "validation",
  "fast-moving",
  "ambiguity"
] as const;

export function normalizeForMatching(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s/+.-]/g, " ");
}

export function tokenize(input: string): string[] {
  return normalizeForMatching(input)
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

export function extractJobDescriptionSignals(jobDescription?: string): string[] {
  const signalCandidates = [
    ...EMBEDDED_ROLE_KEYWORDS,
    ...PRODUCT_ROLE_KEYWORDS,
    ...AI_PRODUCT_ROLE_KEYWORDS,
    "market research",
    "competitive benchmarking",
    "user interviews",
    "usage analytics",
    "feature prioritization",
    "go-to-market",
    "end-to-end ownership",
    "ai-driven",
    "prompt design",
    "grounding",
    "evaluation",
    "decision-support",
    "concept to delivery",
    "ownership"
  ];
  const normalized = normalizeForMatching(jobDescription || "");

  if (!normalized.trim()) {
    return [];
  }

  const scores = new Map<string, number>();

  for (const phrase of signalCandidates) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = normalized.match(new RegExp(`\\b${escaped}\\b`, "g"));

    if (matches?.length) {
      scores.set(phrase, matches.length * 8);
    }
  }

  for (const token of tokenize(normalized)) {
    const current = scores.get(token) || 0;
    scores.set(token, current + 1);
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 14)
    .map(([signal]) => signal);
}

function countMatches(haystack: string, keywords: readonly string[]): number {
  return keywords.filter((keyword) => haystack.includes(keyword)).length;
}

export function detectRoleMode(
  roleTarget: RoleTarget,
  jobDescriptionSignals: string[],
  jobDescription?: string
): {
  isEmbeddedRole: boolean;
  isProductRole: boolean;
  isAIProductRole: boolean;
  roleMode: RoleMode;
  aiProductReasons: string[];
} {
  const normalizedRoleTarget = normalizeForMatching(roleTarget);
  const normalizedJobDescription = normalizeForMatching(jobDescription || "");
  const signalsText = jobDescriptionSignals.join(" ");
  const aiProductReasons = AI_PRODUCT_ROLE_KEYWORDS.filter(
    (keyword) =>
      normalizedJobDescription.includes(keyword) || signalsText.includes(keyword)
  );

  const embeddedScore =
    countMatches(normalizedRoleTarget, EMBEDDED_ROLE_KEYWORDS) * 3 +
    countMatches(normalizedJobDescription, EMBEDDED_ROLE_KEYWORDS) * 2 +
    countMatches(signalsText, EMBEDDED_ROLE_KEYWORDS);
  const productScore =
    (roleTarget === "Product Manager" || roleTarget === "Product Owner" ? 5 : 0) +
    countMatches(normalizedRoleTarget, PRODUCT_ROLE_KEYWORDS) * 3 +
    countMatches(normalizedJobDescription, PRODUCT_ROLE_KEYWORDS) * 2 +
    countMatches(signalsText, PRODUCT_ROLE_KEYWORDS);
  const aiProductScore =
    (roleTarget === "AI Product Manager" ? 6 : 0) +
    countMatches(normalizedJobDescription, AI_PRODUCT_ROLE_KEYWORDS) * 3 +
    countMatches(signalsText, AI_PRODUCT_ROLE_KEYWORDS) * 2 +
    (aiProductReasons.length >= 3 ? 4 : 0);

  const isAIProductRole =
    aiProductScore >= 5 &&
    aiProductScore >= embeddedScore &&
    aiProductScore >= productScore;
  const isEmbeddedRole =
    !isAIProductRole &&
    embeddedScore >= 3 &&
    embeddedScore > productScore;
  const isProductRole =
    !isEmbeddedRole &&
    (isAIProductRole ||
      productScore >= 3 ||
      roleTarget === "Product Manager" ||
      roleTarget === "Product Owner");

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
    roleMode,
    aiProductReasons
  };
}

export function neutralizeIdentityForTechnicalRoles(text: string): string {
  return text
    .replace(/Senior Product Manager/g, "automotive embedded systems professional")
    .replace(/Product Manager/g, "embedded systems professional")
    .replace(/Product Owner/g, "engineering-focused delivery role")
    .replace(/\bleader\b/g, "professional");
}
