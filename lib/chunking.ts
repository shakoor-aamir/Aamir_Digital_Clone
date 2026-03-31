import { EvidenceStrength, RagIndexChunk, RoleMode } from "@/lib/types";
import { normalizeForMatching } from "@/lib/rag";

const DOMAIN_TERMS = [
  "automotive",
  "diagnostics",
  "autosar",
  "requirements",
  "carweaver",
  "carcom",
  "elektra",
  "systemweaver",
  "supplier",
  "verification",
  "canoe",
  "trace32",
  "roadmap",
  "stakeholder",
  "platform",
  "customer",
  "ai",
  "llm",
  "experimentation"
] as const;

function inferRoleTags(title: string, content: string): RoleMode[] {
  const haystack = normalizeForMatching(`${title} ${content}`);
  const tags = new Set<RoleMode>();

  if (
    haystack.includes("embedded") ||
    haystack.includes("autosar") ||
    haystack.includes("diagnostics") ||
    haystack.includes("carweaver") ||
    haystack.includes("ecu") ||
    haystack.includes("system architecture")
  ) {
    tags.add("embedded");
  }

  if (
    haystack.includes("product") ||
    haystack.includes("roadmap") ||
    haystack.includes("stakeholder") ||
    haystack.includes("backlog") ||
    haystack.includes("delivery")
  ) {
    tags.add("product");
  }

  if (
    haystack.includes("ai") ||
    haystack.includes("llm") ||
    haystack.includes("experimentation") ||
    haystack.includes("prompt") ||
    haystack.includes("evaluation")
  ) {
    tags.add("ai-product");
    tags.add("product");
  }

  if (tags.size === 0) {
    tags.add("general");
  }

  return Array.from(tags);
}

function inferDomainTags(title: string, content: string): string[] {
  const haystack = normalizeForMatching(`${title} ${content}`);
  return DOMAIN_TERMS.filter((term) => haystack.includes(term));
}

function inferEvidenceStrength(sourceFile: string, sectionTitle: string): EvidenceStrength {
  const normalizedTitle = sectionTitle.toLowerCase();

  if (sourceFile === "master_profile.md") {
    return "high";
  }

  if (
    sourceFile === "interview_answer_bank.md" ||
    sourceFile === "answers_library.md" ||
    normalizedTitle.includes("timeline") ||
    normalizedTitle.includes("education") ||
    normalizedTitle.includes("certification")
  ) {
    return "medium";
  }

  return "low";
}

function inferExperienceArea(title: string, content: string): string {
  const haystack = normalizeForMatching(`${title} ${content}`);

  if (
    haystack.includes("autosar") ||
    haystack.includes("diagnostics") ||
    haystack.includes("embedded")
  ) {
    return "Automotive embedded systems";
  }

  if (haystack.includes("architecture") || haystack.includes("system")) {
    return "Systems architecture";
  }

  if (
    haystack.includes("product") ||
    haystack.includes("roadmap") ||
    haystack.includes("stakeholder")
  ) {
    return "Product leadership";
  }

  if (haystack.includes("ai") || haystack.includes("llm")) {
    return "AI product strategy";
  }

  return "Cross-functional delivery";
}

function createChunk(
  sourceFile: string,
  sectionTitle: string,
  content: string,
  suffix: string
): Omit<RagIndexChunk, "embedding"> {
  const normalizedContent = normalizeForMatching(content);
  const roleTags = inferRoleTags(sectionTitle, content);
  const domainTags = inferDomainTags(sectionTitle, content);
  const evidenceStrength = inferEvidenceStrength(sourceFile, sectionTitle);

  return {
    chunkId: `${sourceFile}:${sectionTitle}:${suffix}`,
    sourceFile,
    sectionTitle,
    content,
    normalizedContent,
    roleTags,
    domainTags,
    evidenceStrength,
    experienceArea: inferExperienceArea(sectionTitle, content)
  };
}

function splitSectionIntoChunks(
  sourceFile: string,
  sectionTitle: string,
  content: string
): Array<Omit<RagIndexChunk, "embedding">> {
  const subsectionMatches = Array.from(
    content.matchAll(/###\s+([^\n]+)\n([\s\S]*?)(?=\n###\s+|\s*$)/g)
  );

  if (subsectionMatches.length === 0) {
    return [createChunk(sourceFile, sectionTitle, content.trim(), "0")];
  }

  const chunks: Array<Omit<RagIndexChunk, "embedding">> = [];
  const preamble = content.split(/\n###\s+/)[0]?.trim();

  if (preamble) {
    chunks.push(createChunk(sourceFile, sectionTitle, preamble, "preamble"));
  }

  subsectionMatches.forEach((match, index) => {
    const subsectionTitle = `${sectionTitle} / ${match[1].trim()}`;
    const subsectionContent = match[2].trim();
    chunks.push(
      createChunk(sourceFile, subsectionTitle, subsectionContent, `${index + 1}`)
    );
  });

  return chunks;
}

export function chunkMarkdownDocument(
  sourceFile: string,
  markdown: string
): Array<Omit<RagIndexChunk, "embedding">> {
  const sectionMatches = Array.from(
    markdown.matchAll(/##\s+([^\n]+)\n([\s\S]*?)(?=\n##\s+|\s*$)/g)
  );

  return sectionMatches.flatMap((match) => {
    const sectionTitle = match[1].trim();
    const sectionContent = match[2].trim();
    return splitSectionIntoChunks(sourceFile, sectionTitle, sectionContent);
  });
}
