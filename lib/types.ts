export const ANSWER_MODES = [
  "concise",
  "interview",
  "executive",
  "technical deep dive"
] as const;

export const ROLE_TARGETS = [
  "Product Manager",
  "Product Owner",
  "System Architect",
  "AI Product Manager",
  "Embedded/Automotive leader"
] as const;

export type AnswerMode = (typeof ANSWER_MODES)[number];
export type RoleTarget = (typeof ROLE_TARGETS)[number];
export type RoleMode = "embedded" | "product" | "ai-product" | "general";
export type EvidenceStrength = "high" | "medium" | "low";

export interface AnswerRequestBody {
  question: string;
  answerMode: AnswerMode;
  roleTarget: RoleTarget;
  jobDescription?: string;
}

export interface AnswerResponse {
  answer: string;
  experienceAreasUsed: string[];
  supportNote: string;
}

export interface RetrievalSection {
  id: string;
  title: string;
  source: string;
  content: string;
  experienceArea: string;
  score: number;
  roleTags?: RoleMode[];
  domainTags?: string[];
  evidenceStrength?: EvidenceStrength;
  semanticScore?: number;
}

export interface RetrievalResult {
  sections: RetrievalSection[];
  experienceAreas: string[];
  jobDescriptionSignals: string[];
  roleMode?: RoleMode;
}

export interface RagIndexChunk {
  chunkId: string;
  sourceFile: string;
  sectionTitle: string;
  content: string;
  normalizedContent: string;
  roleTags: RoleMode[];
  domainTags: string[];
  evidenceStrength: EvidenceStrength;
  experienceArea: string;
  embedding: number[];
}

export interface RagIndexFile {
  createdAt: string;
  embeddingModel: string;
  filesIndexed: string[];
  totalChunks: number;
  chunks: RagIndexChunk[];
}
