import { getRuntimeEnv } from "./runtime-env";
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function authorize(request: Request): Promise<string> {
  const env = getRuntimeEnv();
  if (env.PUBLIC_SHOWCASE_MODE !== "false")
    throw new ApiError("公开展示模式不开放真实分析、知识库和记忆。", 403);
  const token = env.AIMATCH_ACCESS_TOKEN?.trim();
  if (!token || token.length < 24)
    throw new ApiError(
      "请在服务端设置至少 24 字符的 AIMATCH_ACCESS_TOKEN。",
      503,
    );
  const supplied =
    request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const hash = async (s: string) =>
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    );
  const [a, b] = await Promise.all([hash(supplied), hash(token)]);
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  if (mismatch) throw new ApiError("访问口令不正确。", 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new ApiError("不接受跨站请求。", 403);
  return "private-owner";
}
export async function readBody(
  request: Request,
  maxBytes = 100_000,
): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("请求内容为空。");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) {
      await reader.cancel();
      throw new ApiError("请求内容超过大小限制。", 413);
    }
    chunks.push(value);
  }
  const data = new Uint8Array(length);
  let offset = 0;
  for (const c of chunks) {
    data.set(c, offset);
    offset += c.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(data));
  } catch {
    throw new ApiError("无效 JSON。");
  }
}
export function apiFailure(error: unknown) {
  return Response.json(
    { error: error instanceof Error ? error.message : "请求失败" },
    {
      status: error instanceof ApiError ? error.status : 502,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export function json(data: unknown) {
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}
