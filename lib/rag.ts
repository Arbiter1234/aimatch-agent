import { getRuntimeEnv } from "./runtime-env";
import type { Chunk, Store } from "./storage";
export type Retrieval = {
  mode: "vector" | "empty";
  citations: Array<{
    id: string;
    title: string;
    source: string;
    content: string;
    score: number;
  }>;
  embeddingTokens: number;
};
export function chunkText(text: string, size = 700, overlap = 100): string[] {
  if (size < 1 || overlap < 0 || overlap >= size)
    throw new Error("Invalid chunk parameters");
  const normalized = text.replace(/\r\n/g, "\n").trim(),
    result: string[] = [];
  for (let i = 0; i < normalized.length; i += size - overlap) {
    result.push(normalized.slice(i, i + size));
    if (i + size >= normalized.length) break;
  }
  return result;
}
export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) return 0;
  let dot = 0,
    x = 0,
    y = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    x += a[i] * a[i];
    y += b[i] * b[i];
  }
  return x && y ? dot / Math.sqrt(x * y) : 0;
}
export async function embed(input: string[]) {
  const env = getRuntimeEnv();
  if (!env.OPENAI_API_KEY?.trim())
    throw new Error("请配置 OPENAI_API_KEY 后再导入或检索知识库。");
  const model = env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY.trim()}`,
    },
    body: JSON.stringify({
      model,
      input,
      encoding_format: "float",
      dimensions: 512,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok)
    throw new Error(
      `Embedding 请求失败（HTTP ${r.status}），请核对密钥、模型权限和额度。`,
    );
  const data = (await r.json()) as {
    data: Array<{ index: number; embedding: number[] }>;
    usage?: { total_tokens: number };
  };
  const vectors = data.data
    ?.sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
  if (
    !vectors ||
    vectors.length !== input.length ||
    vectors.some((v) => v.length !== 512 || v.some((n) => !Number.isFinite(n)))
  )
    throw new Error("Embedding 返回维度或数量无效。");
  return { vectors, model, tokens: data.usage?.total_tokens ?? 0 };
}
export async function ingest(
  store: Store,
  title: string,
  source: string,
  text: string,
) {
  const parts = chunkText(text),
    existing = await store.chunks();
  if (existing.length + parts.length > 200)
    throw new Error("知识库上限为 200 个分块，请先删除不需要的文档。");
  const { vectors, model, tokens } = await embed(parts),
    documentId = crypto.randomUUID();
  const chunks: Chunk[] = parts.map((content, i) => ({
    id: `${documentId}-${i}`,
    document_id: documentId,
    title,
    source,
    content,
    vector: JSON.stringify(vectors[i]),
    model,
  }));
  await store.addChunks(chunks);
  if (
    (await store.chunks()).filter((c) => c.document_id === documentId)
      .length !== chunks.length
  ) {
    await store.deleteDocument(documentId);
    throw new Error("并发导入超过容量，文档已撤销，请重试。");
  }
  return { documentId, chunks: chunks.length, embeddingTokens: tokens };
}
export async function retrieve(
  store: Store,
  query: string,
): Promise<Retrieval> {
  const chunks = await store.chunks();
  if (!chunks.length)
    return { mode: "empty", citations: [], embeddingTokens: 0 };
  const { vectors, model, tokens } = await embed([query.slice(0, 3000)]);
  const compatible = chunks.filter((c) => c.model === model);
  if (compatible.length !== chunks.length)
    throw new Error(
      "知识库的 Embedding 模型与当前配置不同，请删除旧文档后重新导入。",
    );
  const ranked = compatible
    .map((c) => ({
      ...c,
      score: cosine(vectors[0], JSON.parse(c.vector) as number[]),
    }))
    .filter((c) => c.score >= 0.25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  return {
    mode: "vector",
    citations: ranked.map((c) => ({
      id: c.id,
      title: c.title,
      source: c.source,
      content: c.content,
      score: Math.round(c.score * 1000) / 1000,
    })),
    embeddingTokens: tokens,
  };
}
