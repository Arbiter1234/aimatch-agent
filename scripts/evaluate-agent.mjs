import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
if (existsSync(".dev.vars")) process.loadEnvFile(".dev.vars");
else if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const accessToken = process.env.AIMATCH_ACCESS_TOKEN;
if (!accessToken) throw new Error("请在 .dev.vars 配置工作台访问口令。");

const casesUrl = new URL("../evals/cases.json", import.meta.url);
const allCases = JSON.parse(await readFile(casesUrl, "utf8"));
const limitFlag = process.argv.find((item) => item.startsWith("--limit="));
const limit = limitFlag
  ? Math.max(1, Number.parseInt(limitFlag.split("=")[1], 10))
  : allCases.length;
const cases = allCases.slice(0, limit);
const baseUrl = (
  process.env.AIMATCH_BASE_URL || "http://127.0.0.1:3000"
).replace(/\/$/, "");

const configResponse = await fetch(`${baseUrl}/api/agent/analyze`);
if (!configResponse.ok) {
  throw new Error(`无法读取 Agent 配置：HTTP ${configResponse.status}`);
}
const config = await configResponse.json();
if (config.framework !== "LangGraph") {
  throw new Error("当前服务没有报告 LangGraph 编排，已停止真实评测。");
}
if (config.publicShowcaseMode) {
  throw new Error(
    "当前服务仍处于公开展示模式。请在 .dev.vars 设置 PUBLIC_SHOWCASE_MODE=false 后重启服务。",
  );
}
if (!config.configured) {
  throw new Error(
    "服务端尚未读取到 OPENAI_API_KEY，请检查 .dev.vars 后重启服务。",
  );
}

console.log(
  `AIMatch ${config.framework} · ${config.model} · ${config.graphNodes.length} nodes`,
);

const rows = [];

for (const testCase of cases) {
  const startedAt = performance.now();
  let payload;
  let error = "";

  try {
    const response = await fetch(`${baseUrl}/api/agent/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        resumeText: testCase.resumeText,
        jdText: testCase.jdText,
        preferences: {
          targetDirection: "AI 产品经理",
          targetCity: "不限",
        },
      }),
    });
    payload = await response.json();
    if (!response.ok) {
      throw new Error(
        payload.message || payload.error || `HTTP ${response.status}`,
      );
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }

  const durationMs = Math.round(performance.now() - startedAt);
  const score = payload?.analysis?.score;
  const scoreInRange =
    typeof score === "number" &&
    score >= testCase.expected.minScore &&
    score <= testCase.expected.maxScore;
  const missingEvidenceCount = payload?.audit?.missingEvidence?.length ?? 0;
  const missingEvidencePass = testCase.expected.mustMentionMissingEvidence
    ? missingEvidenceCount > 0 ||
      payload?.analysis?.evidenceMatches?.some(
        (item) => item.strength === "missing",
      )
    : true;
  const schemaPass =
    Array.isArray(payload?.analysis?.competencies) &&
    Array.isArray(payload?.analysis?.evidenceMatches) &&
    Array.isArray(payload?.trace) &&
    typeof payload?.audit?.confidence === "number";

  rows.push({
    id: testCase.id,
    case: testCase.name,
    score: score ?? "-",
    expected: `${testCase.expected.minScore}-${testCase.expected.maxScore}`,
    scorePass: scoreInRange,
    evidencePass: missingEvidencePass,
    schemaPass,
    audit: payload?.audit?.verdict ?? "-",
    inputTokens: payload?.usage?.inputTokens ?? 0,
    outputTokens: payload?.usage?.outputTokens ?? 0,
    trace: payload?.trace?.map((item) => item.id).join(" → ") ?? "-",
    durationMs,
    error,
  });
}

console.table(
  rows.map(({ error, ...row }) => ({
    ...row,
    result:
      !error && row.scorePass && row.evidencePass && row.schemaPass
        ? "PASS"
        : "FAIL",
  })),
);

const passed = rows.filter(
  (row) => !row.error && row.scorePass && row.evidencePass && row.schemaPass,
).length;
const summary = {
  baseUrl,
  cases: rows.length,
  passed,
  passRate: rows.length ? Math.round((passed / rows.length) * 100) : 0,
  averageLatencyMs: rows.length
    ? Math.round(
        rows.reduce((sum, row) => sum + row.durationMs, 0) / rows.length,
      )
    : 0,
  failures: rows
    .filter(
      (row) =>
        row.error || !row.scorePass || !row.evidencePass || !row.schemaPass,
    )
    .map((row) => ({ id: row.id, error: row.error })),
};

console.log("\nEvaluation summary");
console.log(JSON.stringify(summary, null, 2));

if (passed !== rows.length) process.exitCode = 1;
