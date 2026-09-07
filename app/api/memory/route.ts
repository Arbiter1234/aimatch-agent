import { z } from "zod";
import {
  authorize,
  apiFailure,
  json,
  readBody,
  ApiError,
} from "../../../lib/private-api";
import { getStore } from "../../../lib/storage";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    return json({
      memories: await getStore(await authorize(request)).memories(),
    });
  } catch (e) {
    return apiFailure(e);
  }
}
const input = z.object({
  content: z.string().trim().min(1).max(2000),
  id: z.string().uuid().optional(),
});
export async function POST(request: Request) {
  try {
    const store = getStore(await authorize(request));
    const parsed = input.safeParse(await readBody(request, 12000));
    if (!parsed.success) throw new ApiError("偏好须为 1–2000 字符。");
    return json({
      id: await store.saveMemory(
        "preference",
        parsed.data.content,
        parsed.data.id,
      ),
    });
  } catch (e) {
    return apiFailure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    const store = getStore(await authorize(request)),
      id = new URL(request.url).searchParams.get("id");
    if (id && !z.string().uuid().safeParse(id).success)
      throw new ApiError("记忆 ID 无效。");
    await store.deleteMemory(id ?? undefined);
    return json({ deleted: true });
  } catch (e) {
    return apiFailure(e);
  }
}
