import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, mkdirSync, mkdtempSync } from "node:fs";
import path from "node:path";
import { Store, type Database, type Statement } from "../lib/storage";
import { withRuntimeEnv } from "../lib/runtime-env";
import { chunkText, cosine, ingest, retrieve } from "../lib/rag";
import { runAnalysis } from "../lib/agent/engine";
import { POST as analyze } from "../app/api/agent/analyze/route";
import {
  GET as readMemory,
  POST as writeMemory,
  DELETE as deleteMemory,
} from "../app/api/memory/route";
import { GET as readKnowledge } from "../app/api/knowledge/route";
const migration = readFileSync(
  new URL("../drizzle/0000_last_nightshade.sql", import.meta.url),
  "utf8",
);
function database(filename = ":memory:", initialize = true) {
  const db = new DatabaseSync(filename);
  if (initialize) db.exec(migration);
  const adapter: Database = {
    prepare(sql: string): Statement {
      let values: SQLInputValue[] = [];
      return {
        bind(...next: unknown[]) {
          values = next as SQLInputValue[];
          return this;
        },
        async all<T>() {
          return { results: db.prepare(sql).all(...values) as T[] };
        },
        async run() {
          return db.prepare(sql).run(...values);
        },
      };
    },
    async batch(statements) {
      db.exec("BEGIN");
      try {
        const r = [];
        for (const s of statements) r.push(await s.run());
        db.exec("COMMIT");
        return r;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { db, adapter };
}
const env = {
  OPENAI_API_KEY: "mock-key-not-a-secret",
  OPENAI_MODEL: "mock-model",
  PUBLIC_SHOWCASE_MODE: "false",
  AIMATCH_ACCESS_TOKEN: "test-access-token-long-enough-for-lab",
};
const resume = {
  candidateName: "合成用户",
  headline: "AI 产品",
  education: [],
  experiences: [],
  projects: [],
  skills: ["RAG"],
  evidenceSnippets: [
    { claim: "原型", evidence: "完成 RAG 原型", source: "项目1" },
  ],
  summary: "合成",
  uncertainties: [],
};
const job = {
  roleTitle: "AI 产品经理",
  company: "合成",
  location: "沈阳",
  employmentType: "实习",
  responsibilities: [],
  mustHaves: ["RAG"],
  niceToHaves: [],
  evaluationSignals: [],
  keywords: ["RAG"],
};
const report = {
  candidateName: "合成用户",
  targetRole: "AI 产品经理",
  score: 65,
  fitLevel: "medium",
  executiveSummary: "需要验证",
  recommendation: "准备评测",
  competencies: [],
  evidenceMatches: [],
  gaps: [{ priority: "P0", title: "补评测", impact: "可信度", action: "测试" }],
  actionPlan: [{ day: "1", title: "设计用例", deliverable: "用例集" }],
  interviewQuestions: [],
  resumeEdits: [],
  followUpQuestions: [],
  assumptions: [],
  knowledgeAdvice: [],
};
function vector(text: string) {
  return Array.from({ length: 512 }, (_, i) =>
    i === 0
      ? text.includes("无关")
        ? 0
        : 1
      : i === 1 && text.includes("无关")
        ? 1
        : 0,
  );
}
function mockModel(t: TestContext, verdict = "pass", badCitation = false) {
  const calls: Array<{
    name: string;
    input: string;
    body: Record<string, unknown>;
  }> = [];
  let citation = "";
  t.mock.method(
    globalThis,
    "fetch",
    async (url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      if (String(url).endsWith("/embeddings"))
        return Response.json({
          data: body.input.map((s: string, i: number) => ({
            index: i,
            embedding: vector(s),
          })),
          usage: { total_tokens: 10 },
        });
      assert.equal(String(url), "https://api.openai.com/v1/responses");
      const name = body.text.format.name,
        input =
          typeof body.input === "string"
            ? body.input
            : JSON.stringify(body.input);
      calls.push({ name, input, body });
      if (name === "job_match_analysis")
        citation = input.match(/"id": "([^"]+-0)"/)?.[1] ?? "";
      let data: unknown = report;
      if (name === "resume_profile") data = resume;
      else if (name === "job_profile") data = job;
      else if (name === "evidence_critic")
        data = {
          verdict,
          confidence: 70,
          unsupportedClaims: verdict === "revise" ? ["待改"] : [],
          missingEvidence: ["缺测试"],
          repairInstructions: ["修改"],
          questions: ["是否做过测试？"],
        };
      else
        data = {
          ...report,
          score: name === "repaired_job_match_analysis" ? 55 : 65,
          knowledgeAdvice: badCitation
            ? [{ advice: "未知", sourceIds: ["fake"] }]
            : citation
              ? [{ advice: "完善 RAG 评测", sourceIds: [citation] }]
              : [],
        };
      return Response.json({
        status: "completed",
        output: [{ content: [{ text: JSON.stringify(data) }] }],
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
      });
    },
  );
  return calls;
}
const input = {
  resumeText: "SENSITIVE_RESUME_SENTINEL 完成 RAG 原型",
  jdText:
    "招聘 AI 产品经理，负责 RAG 和 Agent 产品功能设计、需求调研、产品评测与开发协作，并根据反馈改进用户体验。",
};
test("chunking has bounded overlap; cosine handles mismatched and zero vectors", () => {
  assert.deepEqual(chunkText("abcdefghij", 6, 2), ["abcdef", "efghij"]);
  assert.deepEqual(chunkText(""), []);
  assert.throws(() => chunkText("abc", 2, 2));
  assert.equal(cosine([1, 0], [1, 0]), 1);
  assert.equal(cosine([0], [1]), 0);
  assert.equal(cosine([1], [1, 0]), 0);
});
test("D1-compatible SQL persists across restart, isolates owners, updates and deletes", async () => {
  mkdirSync("outputs/tests", { recursive: true });
  const folder = mkdtempSync(path.resolve("outputs/tests/memory-"));
  const filename = path.join(folder, "test.sqlite");
  let d = database(filename);
  const a = new Store(d.adapter, "a"),
    b = new Store(d.adapter, "b");
  const id = await a.saveMemory("preference", "沈阳");
  await b.saveMemory("preference", "跨用户覆盖", id);
  assert.deepEqual(await b.memories(), []);
  d.db.close();
  d = database(filename, false);
  const reopened = new Store(d.adapter, "a");
  assert.equal((await reopened.memories())[0].content, "沈阳");
  await reopened.saveMemory("preference", "北京", id);
  assert.equal((await reopened.memories())[0].content, "北京");
  await reopened.deleteMemory(id);
  assert.deepEqual(await reopened.memories(), []);
  d.db.close();
});
test("RAG ingests, retrieves source IDs, returns no-hit, isolates and deletes", async (t) => {
  mockModel(t);
  const d = database();
  t.after(() => d.db.close());
  const store = new Store(d.adapter, "a");
  await withRuntimeEnv(env, async () => {
    assert.equal((await retrieve(store, "RAG")).mode, "empty");
    const r = await ingest(
      store,
      "RAG 方法",
      "合成示例",
      "RAG 分块、向量化与检索测试。".repeat(8),
    );
    assert.equal(
      (await retrieve(store, "RAG")).citations[0].id,
      r.documentId + "-0",
    );
    assert.equal((await retrieve(store, "无关")).citations.length, 0);
    assert.equal(
      (await retrieve(new Store(d.adapter, "b"), "RAG")).mode,
      "empty",
    );
    await store.deleteDocument(r.documentId);
    assert.equal((await store.chunks()).length, 0);
  });
});
for (const verdict of ["pass", "revise", "need_more_info"]) {
  test(`real LangGraph runtime: ${verdict}, RAG and memory context, token reducer`, async (t) => {
    const calls = mockModel(t, verdict),
      d = database();
    t.after(() => d.db.close());
    const store = new Store(d.adapter, "a");
    await store.saveMemory("preference", "实习优先沈阳");
    await withRuntimeEnv(env, async () => {
      await ingest(store, "RAG", "合成教学", "RAG 检索评测知识".repeat(10));
      const r = await runAnalysis({ ...input, remember: true }, store);
      assert.equal(
        r.audit.verdict,
        verdict === "revise"
          ? "revised"
          : verdict === "pass"
            ? "pass"
            : "needs_input",
      );
      assert.equal(r.trace.filter((n) => n.id === "coverage").length, 1);
      assert.equal(r.usage.totalTokens, verdict === "revise" ? 75 : 60);
      assert.equal(r.retrieval.citations.length, 1);
      assert.equal(r.memory.saved, true);
      assert.ok(
        calls
          .find((c) => c.name === "job_match_analysis")
          ?.input.includes("实习优先沈阳"),
      );
      assert.ok(
        calls
          .find((c) => c.name === "evidence_critic")
          ?.input.includes("RAG 检索评测知识"),
      );
      assert.ok(calls.every((c) => c.body.store === false));
      if (verdict === "need_more_info")
        assert.ok(r.analysis.followUpQuestions.includes("是否做过测试？"));
      if (verdict === "revise") assert.equal(r.analysis.score, 55);
      assert.ok(
        !(await store.memories()).some((m) =>
          m.content.includes("SENSITIVE_RESUME_SENTINEL"),
        ),
      );
      const again = await runAnalysis(input, store);
      assert.equal(again.memory.used, 2);
      assert.equal(again.memory.saved, false);
    });
  });
}
test("unknown knowledge citation rejects output and does not save memory", async (t) => {
  mockModel(t, "pass", true);
  const d = database();
  t.after(() => d.db.close());
  const store = new Store(d.adapter, "a");
  await withRuntimeEnv(env, async () => {
    await assert.rejects(
      runAnalysis({ ...input, remember: true }, store),
      /未知知识片段/,
    );
    assert.equal((await store.memories()).length, 0);
  });
});
function req(
  url: string,
  method = "GET",
  body?: unknown,
  token = env.AIMATCH_ACCESS_TOKEN,
) {
  return new Request("http://localhost" + url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
test("API enforces public mode, access token, schema and CRUD behavior", async () => {
  const d = database();
  try {
    await withRuntimeEnv(
      { ...env, DB: d.adapter, PUBLIC_SHOWCASE_MODE: "true" },
      async () => {
        assert.equal(
          (await analyze(req("/api/agent/analyze", "POST", input))).status,
          403,
        );
        assert.equal((await readMemory(req("/api/memory"))).status, 403);
        assert.equal((await readKnowledge(req("/api/knowledge"))).status, 403);
      },
    );
    await withRuntimeEnv({ ...env, DB: d.adapter }, async () => {
      assert.equal(
        (await readMemory(req("/api/memory", "GET", undefined, "wrong")))
          .status,
        401,
      );
      assert.equal(
        (await analyze(req("/api/agent/analyze", "POST", { jdText: 4 })))
          .status,
        400,
      );
      const r = await writeMemory(
        req("/api/memory", "POST", { content: "北京" }),
      );
      assert.equal(r.status, 200);
      const { id } = (await r.json()) as { id: string };
      assert.equal(
        (
          (await (await readMemory(req("/api/memory"))).json()) as {
            memories: unknown[];
          }
        ).memories.length,
        1,
      );
      await deleteMemory(req("/api/memory?id=" + id, "DELETE"));
      assert.equal(
        (
          (await (await readMemory(req("/api/memory"))).json()) as {
            memories: unknown[];
          }
        ).memories.length,
        0,
      );
    });
  } finally {
    d.db.close();
  }
});
test("request-scoped runtime values remain isolated across concurrency", async () => {
  const [a, b] = await Promise.all([
    withRuntimeEnv({ ...env, PUBLIC_SHOWCASE_MODE: "true" }, () =>
      readMemory(req("/api/memory")),
    ),
    withRuntimeEnv(
      { ...env, AIMATCH_ACCESS_TOKEN: "different-token-that-is-long-enough" },
      () => readMemory(req("/api/memory")),
    ),
  ]);
  assert.equal(a.status, 403);
  assert.equal(b.status, 401);
});
