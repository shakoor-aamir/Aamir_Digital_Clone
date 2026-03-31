import { createEmbedding } from "@/lib/embeddings";
import { buildFallbackChunks, loadRagIndex } from "@/lib/rag-index";
import {
  detectRoleMode,
  extractJobDescriptionSignals,
  neutralizeIdentityForTechnicalRoles,
  normalizeForMatching,
  tokenize
} from "@/lib/rag";
import { cosineSimilarity } from "@/lib/similarity";
import { RagIndexChunk, RetrievalResult, RetrievalSection, RoleMode, RoleTarget } from "@/lib/types";

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
  "education",
  "certifications & continuous learning",
  "tools & standards"
] as const;

const EMBEDDED_TERMS = [
  "requirements",
  "diagnostics",
  "autosar",
  "carweaver",
  "carcom",
  "elektra",
  "systemweaver",
  "supplier",
  "verification"
] as const;

const PRODUCT_TERMS = [
  "roadmap",
  "backlog",
  "product strategy",
  "stakeholder",
  "delivery",
  "kpi",
  "platform",
  "ownership",
  "customer"
] as const;

const AI_PRODUCT_TERMS = [
  "ownership",
  "ideation",
  "experimentation",
  "concept to launch",
  "ai",
  "ai-driven",
  "llm-based systems",
  "llm",
  "grounded interview agent",
  "interview agent",
  "profile-grounded system",
  "prompt design",
  "retrieval",
  "grounding",
  "evaluation",
  "decision-support",
  "workflow assistants",
  "ai-enabled workflows",
  "product concepts",
  "building prototypes",
  "prototype",
  "prototyping",
  "experiment",
  "iterate",
  "iteration",
  "validate",
  "validation",
  "accuracy",
  "latency",
  "cost",
  "human oversight",
  "human-in-the-loop",
  "reliability",
  "trade-offs",
  "usable product",
  "workflows"
] as const;

const EMBEDDED_FILTER_TERMS = ["ai", "ai-driven", "product strategy"] as const;
const PRODUCT_LOW_LEVEL_TERMS = ["canoe", "trace32", "hal", "cortex-m3", "jtag"] as const;
const AI_PRODUCT_EMBEDDED_PENALTY_TERMS = [
  "embedded systems engineer",
  "research associate",
  "low-level debugging",
  "cortex-m3",
  "jtag",
  "trace32",
  "canoe",
  "automotive embedded systems"
] as const;
const PASSIVE_AI_TERMS = [
  "learning focus",
  "continuous learning focus",
  "applied learning",
  "expanding into ai-driven",
  "currently expanding into ai-driven"
] as const;
const VAGUE_AI_ONLY_TERMS = [
  "ai-powered product concepts",
  "llm-based systems",
  "ai product strategy",
  "expanding into ai-driven product strategy"
] as const;

interface ScoredChunk {
  chunk: RagIndexChunk;
  semanticScore: number;
  finalScore: number;
  reasons: string[];
}

function isFactualProfileQuestion(question: string): boolean {
  const normalized = normalizeForMatching(question);
  return FACTUAL_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function countMatches(haystack: string, signals: readonly string[]): string[] {
  return signals.filter((signal) => haystack.includes(signal));
}

function buildQueryText(
  question: string,
  roleTarget: RoleTarget,
  jobDescriptionSignals: string[],
  roleMode: RoleMode
): string {
  return [
    `Question: ${question}`,
    `Role target: ${roleTarget}`,
    `Route mode: ${roleMode}`,
    `Job description signals: ${jobDescriptionSignals.join(", ")}`
  ].join("\n");
}

function scoreChunk(
  chunk: RagIndexChunk,
  semanticScore: number,
  question: string,
  roleTarget: RoleTarget,
  roleMode: RoleMode,
  factualQuestion: boolean,
  jobDescriptionSignals: string[]
): ScoredChunk {
  const reasons: string[] = [];
  const normalizedChunkText = chunk.normalizedContent;
  const normalizedSectionTitle = chunk.sectionTitle.toLowerCase();
  const queryTokens = tokenize(`${question} ${roleTarget}`);
  const chunkTokens = new Set(tokenize(`${chunk.sectionTitle} ${chunk.content}`));
  let finalScore = semanticScore * 30;
  reasons.push(`semantic score (+${(semanticScore * 30).toFixed(2)})`);

  const exactKeywordMatches = queryTokens.filter((token) => chunkTokens.has(token));
  if (exactKeywordMatches.length > 0) {
    const points = exactKeywordMatches.length * 3;
    finalScore += points;
    reasons.push(`exact keyword matches x${exactKeywordMatches.length} (+${points})`);
  }

  const exactJobDescriptionMatches = countMatches(
    normalizedChunkText,
    jobDescriptionSignals
  );
  if (exactJobDescriptionMatches.length > 0) {
    const points = exactJobDescriptionMatches.length * 5;
    finalScore += points;
    reasons.push(`exact JD matches x${exactJobDescriptionMatches.length} (+${points})`);
  }

  if (chunk.sourceFile === "master_profile.md") {
    finalScore += 8;
    reasons.push("source priority: master_profile (+8)");
  } else if (chunk.sourceFile === "answers_library.md") {
    finalScore += 4;
    reasons.push("source priority: answers_library (+4)");
  } else if (chunk.sourceFile === "interview_answer_bank.md") {
    finalScore += 3;
    reasons.push("source priority: answer_bank (+3)");
  } else if (chunk.sourceFile === "answer_styles.md" || chunk.sourceFile === "red_lines.md") {
    finalScore -= 3;
    reasons.push("low-priority source (-3)");
  }

  if (chunk.evidenceStrength === "high") {
    finalScore += 4;
    reasons.push("evidence strength: high (+4)");
  } else if (chunk.evidenceStrength === "medium") {
    finalScore += 2;
    reasons.push("evidence strength: medium (+2)");
  } else {
    finalScore -= 2;
    reasons.push("evidence strength: low (-2)");
  }

  if (
    FACTUAL_SECTION_TITLES.includes(
      normalizedSectionTitle as (typeof FACTUAL_SECTION_TITLES)[number]
    )
  ) {
    finalScore += 4;
    reasons.push(`factual section: ${normalizedSectionTitle} (+4)`);
  }

  if (factualQuestion && chunk.sourceFile === "master_profile.md") {
    finalScore += 10;
    reasons.push("factual question boost: master_profile (+10)");
  }

  if (chunk.roleTags.includes(roleMode)) {
    finalScore += 6;
    reasons.push(`role-tag match: ${roleMode} (+6)`);
  }

  const domainMatches = chunk.domainTags.filter((tag) => jobDescriptionSignals.includes(tag));
  if (domainMatches.length > 0) {
    const points = domainMatches.length * 3;
    finalScore += points;
    reasons.push(`domain-tag matches x${domainMatches.length} (+${points})`);
  }

  if (roleMode === "embedded") {
    const embeddedMatches = countMatches(normalizedChunkText, EMBEDDED_TERMS);
    if (embeddedMatches.length > 0) {
      const points = embeddedMatches.length * 5;
      finalScore += points;
      reasons.push(`embedded anchors x${embeddedMatches.length} (+${points})`);
    }

    if (EMBEDDED_FILTER_TERMS.some((term) => normalizedChunkText.includes(term))) {
      finalScore -= 8;
      reasons.push("embedded suppression penalty (-8)");
    }
  }

  if (roleMode === "product" || roleMode === "ai-product") {
    const productMatches = countMatches(normalizedChunkText, PRODUCT_TERMS);
    if (productMatches.length > 0) {
      const points = productMatches.length * 5;
      finalScore += points;
      reasons.push(`product anchors x${productMatches.length} (+${points})`);
    }

    const lowLevelTechnicalMatches = countMatches(normalizedChunkText, PRODUCT_LOW_LEVEL_TERMS);
    if (lowLevelTechnicalMatches.length > 0) {
      const points = lowLevelTechnicalMatches.length * 2;
      finalScore -= points;
      reasons.push(`low-level technical penalty (-${points})`);
    }
  }

  if (roleMode === "ai-product") {
    const aiMatches = countMatches(normalizedChunkText, AI_PRODUCT_TERMS);
    if (aiMatches.length > 0) {
      const points = aiMatches.length * 7;
      finalScore += points;
      reasons.push(`ai-product anchors x${aiMatches.length} (+${points})`);
    }

    const concreteAiEvidenceMatches = countMatches(normalizedChunkText, [
      "grounded interview agent",
      "interview agent",
      "profile-grounded system",
      "retrieval",
      "grounding",
      "evaluation",
      "prompt design",
      "decision-support",
      "workflow assistants",
      "prototype",
      "prototyping",
      "experiment",
      "experimentation",
      "validate",
      "validation",
      "iterate",
      "iteration",
      "human-in-the-loop",
      "accuracy",
      "latency",
      "cost",
      "reliability",
      "trade-offs"
    ]);
    if (concreteAiEvidenceMatches.length > 0) {
      const points = concreteAiEvidenceMatches.length * 4;
      finalScore += points;
      reasons.push(`ai-product concrete evidence x${concreteAiEvidenceMatches.length} (+${points})`);
    }

    const embeddedPenaltyMatches = countMatches(
      normalizedChunkText,
      AI_PRODUCT_EMBEDDED_PENALTY_TERMS
    );
    if (embeddedPenaltyMatches.length > 0) {
      const points = embeddedPenaltyMatches.length * 3;
      finalScore -= points;
      reasons.push(`ai-product embedded-first penalty (-${points})`);
    }

    const passiveAiMatches = countMatches(normalizedChunkText, PASSIVE_AI_TERMS);
    if (passiveAiMatches.length > 0 && aiMatches.length === 0) {
      const points = passiveAiMatches.length * 4;
      finalScore -= points;
      reasons.push(`ai-product passive-ai penalty (-${points})`);
    }

    if (
      normalizedChunkText.includes("interview assistant") ||
      normalizedChunkText.includes("retrieval system") ||
      normalizedChunkText.includes("grounded strictly") ||
      normalizedChunkText.includes("llm-based systems")
    ) {
      finalScore += 8;
      reasons.push("ai-product concrete building evidence (+8)");
    }

    const vagueAiMatches = countMatches(normalizedChunkText, VAGUE_AI_ONLY_TERMS);
    if (vagueAiMatches.length > 0 && concreteAiEvidenceMatches.length === 0) {
      const points = vagueAiMatches.length * 3;
      finalScore -= points;
      reasons.push(`ai-product vague-ai penalty (-${points})`);
    }
  }

  if (
    normalizedSectionTitle.includes("professional summary") &&
    (exactJobDescriptionMatches.length > 0 || exactKeywordMatches.length > 0)
  ) {
    finalScore -= 5;
    reasons.push("generic summary penalty (-5)");
  }

  return {
    chunk,
    semanticScore,
    finalScore,
    reasons
  };
}

function applyRoleFiltering(scoredChunks: ScoredChunk[], roleMode: RoleMode): {
  kept: ScoredChunk[];
  suppressed: ScoredChunk[];
} {
  if (roleMode !== "embedded") {
    return {
      kept: scoredChunks,
      suppressed: []
    };
  }

  const kept: ScoredChunk[] = [];
  const suppressed: ScoredChunk[] = [];

  scoredChunks.forEach((scoredChunk) => {
    const normalizedChunkText = scoredChunk.chunk.normalizedContent;
    if (EMBEDDED_FILTER_TERMS.some((term) => normalizedChunkText.includes(term))) {
      suppressed.push(scoredChunk);
    } else {
      kept.push(scoredChunk);
    }
  });

  return {
    kept,
    suppressed
  };
}

function toRetrievalSection(scoredChunk: ScoredChunk, roleMode: RoleMode): RetrievalSection {
  const content =
    roleMode === "embedded"
      ? neutralizeIdentityForTechnicalRoles(scoredChunk.chunk.content)
      : scoredChunk.chunk.content;

  return {
    id: scoredChunk.chunk.chunkId,
    title: scoredChunk.chunk.sectionTitle,
    source: scoredChunk.chunk.sourceFile,
    content,
    experienceArea: scoredChunk.chunk.experienceArea,
    score: scoredChunk.finalScore,
    roleTags: scoredChunk.chunk.roleTags,
    domainTags: scoredChunk.chunk.domainTags,
    evidenceStrength: scoredChunk.chunk.evidenceStrength,
    semanticScore: scoredChunk.semanticScore
  };
}

export async function retrieveRelevantContext(
  question: string,
  roleTarget: RoleTarget,
  jobDescription?: string
): Promise<RetrievalResult> {
  console.log("USER QUESTION:", question);
  const jobDescriptionSignals = extractJobDescriptionSignals(jobDescription);
  const routing = detectRoleMode(roleTarget, jobDescriptionSignals, jobDescription);
  const factualQuestion = isFactualProfileQuestion(question);

  console.log("ROLE ROUTING:");
  console.log("- isEmbeddedRole:", routing.isEmbeddedRole);
  console.log("- isProductRole:", routing.isProductRole);
  console.log("- isAIProductRole:", routing.isAIProductRole);
  console.log("- aiProductReasons:", routing.aiProductReasons);
  console.log("ROLE TYPE:", routing.roleMode);
  console.log("JOB DESCRIPTION SIGNALS:", jobDescriptionSignals);

  const index = await loadRagIndex();
  const chunks = index?.chunks || (await buildFallbackChunks());
  const queryText = buildQueryText(
    question,
    roleTarget,
    jobDescriptionSignals,
    routing.roleMode
  );
  const queryEmbedding = index ? await createEmbedding(queryText) : [];
  const semanticCandidates = chunks
    .map((chunk) => ({
      chunk,
      semanticScore:
        index && chunk.embedding.length > 0
          ? cosineSimilarity(queryEmbedding, chunk.embedding)
          : 0
    }))
    .sort((a, b) => b.semanticScore - a.semanticScore)
    .slice(0, index ? 12 : 16);

  const reranked = semanticCandidates
    .map(({ chunk, semanticScore }) =>
      scoreChunk(
        chunk,
        semanticScore,
        question,
        roleTarget,
        routing.roleMode,
        factualQuestion,
        jobDescriptionSignals
      )
    )
    .sort((a, b) => b.finalScore - a.finalScore);

  const { kept, suppressed } = applyRoleFiltering(reranked, routing.roleMode);
  const selected = kept.slice(0, factualQuestion ? 4 : 6);

  console.log("HYBRID RAG DEBUG");
  console.log("- routeMode:", routing.roleMode);
  console.log(
    "- semanticTop:",
    semanticCandidates.slice(0, 6).map((candidate) => ({
      id: candidate.chunk.chunkId,
      section: candidate.chunk.sectionTitle,
      score: Number(candidate.semanticScore.toFixed(4))
    }))
  );
  console.log(
    "- rerankedTop:",
    reranked.slice(0, 6).map((candidate) => ({
      id: candidate.chunk.chunkId,
      section: candidate.chunk.sectionTitle,
      score: Number(candidate.finalScore.toFixed(2))
    }))
  );
  console.log(
    "- suppressed:",
    suppressed.map((candidate) => ({
      id: candidate.chunk.chunkId,
      section: candidate.chunk.sectionTitle
    }))
  );
  console.log(
    "- finalChunks:",
    selected.map((candidate) => ({
      id: candidate.chunk.chunkId,
      section: candidate.chunk.sectionTitle
    }))
  );

  selected.forEach((candidate, index) => {
    console.log("RETRIEVAL SCORE:");
    console.log(`Chunk ${index}`);
    console.log(`Source: ${candidate.chunk.sourceFile}`);
    console.log(`Section: ${candidate.chunk.sectionTitle}`);
    console.log(`Score: ${candidate.finalScore.toFixed(2)}`);
    console.log("Reasons:");
    candidate.reasons.slice(0, 8).forEach((reason) => {
      console.log(`- ${reason}`);
    });
  });

  const sections = selected.map((candidate) =>
    toRetrievalSection(candidate, routing.roleMode)
  );
  const experienceAreas = Array.from(new Set(sections.map((section) => section.experienceArea)));

  return {
    sections,
    experienceAreas,
    jobDescriptionSignals,
    roleMode: routing.roleMode
  };
}
