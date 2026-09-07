import { z } from "zod";
import {
  authorize,
  apiFailure,
  json,
  readBody,
  ApiError,
} from "../../../lib/private-api";
import { getStore } from "../../../lib/storage";
import { ingest } from "../../../lib/rag";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const chunks = await getStore(await authorize(request)).chunks();
    const docs = new Map<
      string,
      { id: string; title: string; source: string; chunks: number }
    >();
    for (const c of chunks) {
      const doc = docs.get(c.document_id) ?? {
        id: c.document_id,
        title: c.title,
        source: c.source,
        chunks: 0,
      };
      doc.chunks++;
      docs.set(c.document_id, doc);
    }
    return json({ documents: [...docs.values()], chunks: chunks.length });
  } catch (e) {
    return apiFailure(e);
  }
}
const document = z.object({
  title: z.string().trim().min(1).max(120),
  source: z.string().trim().max(500).default("用户提供资料"),
  text: z.string().trim().min(20).max(20000),
});
export async function POST(request: Request) {
  try {
    const store = getStore(await authorize(request));
    const parsed = document.safeParse(await readBody(request));
    if (!parsed.success)
      throw new ApiError("请填写标题和 20–20000 字符的知识正文。");
    return json(
      await ingest(
        store,
        parsed.data.title,
        parsed.data.source,
        parsed.data.text,
      ),
    );
  } catch (e) {
    return apiFailure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    const store = getStore(await authorize(request)),
      id = new URL(request.url).searchParams.get("id");
    if (!id || !z.string().uuid().safeParse(id).success)
      throw new ApiError("文档 ID 无效。");
    await store.deleteDocument(id);
    return json({ deleted: true });
  } catch (e) {
    return apiFailure(e);
  }
}
