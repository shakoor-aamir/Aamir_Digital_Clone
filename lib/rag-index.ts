import fs from "node:fs/promises";
import path from "node:path";
import { chunkMarkdownDocument } from "@/lib/chunking";
import { RagIndexChunk, RagIndexFile } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const ragIndexPath = path.join(dataDir, "rag-index.json");

export async function loadRagIndex(): Promise<RagIndexFile | null> {
  try {
    const content = await fs.readFile(ragIndexPath, "utf8");
    return JSON.parse(content) as RagIndexFile;
  } catch {
    return null;
  }
}

export async function buildFallbackChunks(): Promise<RagIndexChunk[]> {
  const files = await fs.readdir(dataDir);
  const markdownFiles = files.filter(
    (file) => file.endsWith(".md") && file !== "interview_agent_prompt.md"
  );

  const chunks = await Promise.all(
    markdownFiles.map(async (fileName) => {
      const content = await fs.readFile(path.join(dataDir, fileName), "utf8");
      return chunkMarkdownDocument(fileName, content).map((chunk) => ({
        ...chunk,
        embedding: []
      }));
    })
  );

  return chunks.flat();
}

export function getRagIndexPath(): string {
  return ragIndexPath;
}
