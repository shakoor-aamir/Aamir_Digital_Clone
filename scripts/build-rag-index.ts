import fs from "node:fs/promises";
import path from "node:path";
import { chunkMarkdownDocument } from "../lib/chunking";
import { createEmbeddings, getEmbeddingModel } from "../lib/embeddings";
import { RagIndexFile } from "../lib/types";

async function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");

  try {
    const content = await fs.readFile(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();

      if (!process.env[key]) {
        process.env[key] = value.replace(/^"(.*)"$/, "$1");
      }
    }
  } catch {
    // The script can still run if environment variables are already present.
  }
}

async function main() {
  await loadLocalEnv();
  const dataDir = path.join(process.cwd(), "data");
  const outputPath = path.join(dataDir, "rag-index.json");
  const fileNames = (await fs.readdir(dataDir)).filter(
    (fileName) => fileName.endsWith(".md") && fileName !== "interview_agent_prompt.md"
  );

  const chunkInputs = await Promise.all(
    fileNames.map(async (fileName) => {
      const content = await fs.readFile(path.join(dataDir, fileName), "utf8");
      return chunkMarkdownDocument(fileName, content);
    })
  );

  const chunksWithoutEmbeddings = chunkInputs.flat();
  const embeddings = await createEmbeddings(
    chunksWithoutEmbeddings.map((chunk) => chunk.content)
  );

  const index: RagIndexFile = {
    createdAt: new Date().toISOString(),
    embeddingModel: getEmbeddingModel(),
    filesIndexed: fileNames,
    totalChunks: chunksWithoutEmbeddings.length,
    chunks: chunksWithoutEmbeddings.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings[index]
    }))
  };

  await fs.writeFile(outputPath, JSON.stringify(index, null, 2), "utf8");

  console.log("HYBRID RAG INDEX BUILD");
  console.log("- total files indexed:", fileNames.length);
  console.log("- total chunks created:", chunksWithoutEmbeddings.length);
  console.log("- embedding model used:", index.embeddingModel);
  console.log("- output path:", outputPath);
}

main().catch((error) => {
  console.error("Failed to build RAG index.");
  console.error(error);
  process.exit(1);
});
