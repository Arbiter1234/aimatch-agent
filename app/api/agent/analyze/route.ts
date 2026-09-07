import { z } from "zod";
import { getConfig, runAnalysis } from "../../../../lib/agent/engine";
import { getRuntimeEnv } from "../../../../lib/runtime-env";
import { getStore } from "../../../../lib/storage";
import {
  authorize,
  readBody,
  apiFailure,
  json,
  ApiError,
} from "../../../../lib/private-api";
export const runtime = "edge";
export const dynamic = "force-dynamic";
const inputSchema = z
  .object({
    jdText: z.string().trim().min(40).max(45000),
    resumeText: z.string().trim().max(45000).optional(),
    resumeFile: z
      .object({
        name: z.string().max(200).optional(),
        dataUrl: z
          .string()
          .max(12_500_000)
          .startsWith("data:application/pdf;base64,"),
      })
      .optional(),
    preferences: z
      .object({
        targetCity: z.string().max(100).optional(),
        targetDirection: z.string().max(100).optional(),
      })
      .optional(),
    remember: z.boolean().default(false),
  })
  .refine(
    (v) => Boolean(v.resumeText || v.resumeFile),
    "请提供简历文本或 PDF。",
  );
export async function GET() {
  return json(getConfig());
}
export async function POST(request: Request) {
  try {
    const owner = await authorize(request);
    if (!getRuntimeEnv().OPENAI_API_KEY?.trim())
      throw new ApiError("请先配置 OPENAI_API_KEY。", 503);
    const parsed = inputSchema.safeParse(await readBody(request, 13_000_000));
    if (!parsed.success)
      throw new ApiError(
        "输入格式不正确：JD 至少 40 字符，文本最多 45000 字符，PDF 最多 8 MB。",
      );
    return json(await runAnalysis(parsed.data, getStore(owner)));
  } catch (error) {
    return apiFailure(error);
  }
}
