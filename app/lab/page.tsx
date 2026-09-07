"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  AgentRunResponse,
  AgentConfigResponse,
} from "../../lib/agent-types";
import type { MemoryItem } from "../../lib/storage";
import "./lab.css";
type Doc = { id: string; title: string; source: string; chunks: number };
export default function Lab() {
  const [token, setToken] = useState(""),
    [config, setConfig] = useState<AgentConfigResponse | null>(null);
  const [resume, setResume] = useState(""),
    [jd, setJd] = useState(""),
    [pdf, setPdf] = useState<{ name: string; dataUrl: string } | undefined>();
  const [city, setCity] = useState(""),
    [direction, setDirection] = useState("AI 产品经理");
  const [remember, setRemember] = useState(false),
    [result, setResult] = useState<AgentRunResponse | null>(null);
  const [title, setTitle] = useState(""),
    [source, setSource] = useState(""),
    [knowledge, setKnowledge] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]),
    [memories, setMemories] = useState<MemoryItem[]>([]);
  const [note, setNote] = useState(""),
    [editId, setEditId] = useState<string | undefined>();
  const [busy, setBusy] = useState(""),
    [message, setMessage] = useState(""),
    [connected, setConnected] = useState(false);
  useEffect(() => {
    fetch("/api/agent/analyze")
      .then((r) => r.json() as Promise<AgentConfigResponse>)
      .then(setConfig)
      .catch(() => setMessage("无法读取服务配置。"));
  }, []);
  async function api<T = unknown>(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<T> {
    const r = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) {
      const error = data as { error?: string; message?: string };
      throw new Error(error.error || error.message || `HTTP ${r.status}`);
    }
    return data as T;
  }
  async function refresh() {
    const [a, b] = await Promise.all([
      api<{ documents: Doc[] }>("/api/knowledge"),
      api<{ memories: MemoryItem[] }>("/api/memory"),
    ]);
    setDocs(a.documents);
    setMemories(b.memories);
  }
  async function act(label: string, run: () => Promise<void>) {
    setBusy(label);
    setMessage("");
    try {
      await run();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "请求失败");
    } finally {
      setBusy("");
    }
  }
  async function readPdf(file?: File) {
    if (!file) {
      setPdf(undefined);
      return;
    }
    if (
      file.size > 8 * 1024 * 1024 ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setMessage("请选择 8 MB 以内的 PDF。");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("读取 PDF 失败"));
      r.readAsDataURL(file);
    });
    setPdf({
      name: file.name,
      dataUrl: dataUrl.replace(/^data:[^;]*;/, "data:application/pdf;"),
    });
  }
  return (
    <main className="lab">
      <header className="lab-heading">
        <Link href="/">← 作品展示</Link>
        <h1>AIMatch 私有工作台</h1>
        <p>导入参考知识，保存求职偏好，分析简历与岗位的匹配证据。</p>
      </header>
      <section className="lab-card">
        <h2>连接工作台</h2>
        <p>
          服务状态：
          {config
            ? config.publicShowcaseMode
              ? "公开展示模式，请按 README 在本地启用私有模式。"
              : config.configured
                ? "模型密钥已配置"
                : "尚未配置模型密钥"
            : "读取中"}
        </p>
        <label>
          工作台访问口令
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setConnected(false);
            }}
            placeholder="填写 AIMATCH_ACCESS_TOKEN，不是 OpenAI API Key"
          />
        </label>
        <button
          disabled={Boolean(busy) || !token || config?.publicShowcaseMode}
          onClick={() =>
            act("连接", async () => {
              await refresh();
              setConnected(true);
              setMessage("已连接。口令仅保留在当前页面内存中。");
            })
          }
        >
          连接并读取知识与记忆
        </button>
      </section>
      <div role="status" aria-live="polite" className="lab-status">
        {busy ? `${busy}中，请稍候…` : message}
      </div>
      <fieldset disabled={!connected || Boolean(busy)} className="lab-fields">
        <div className="lab-columns">
          <section className="lab-card">
            <h2>1. 知识库 / RAG</h2>
            <p>
              导入岗位要求、产品方法或面试资料。正文会保存并发送至 Embedding
              API；请勿混入个人简历。
            </p>
            <label>
              标题
              <input
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              来源说明或原文网址
              <input
                value={source}
                maxLength={500}
                onChange={(e) => setSource(e.target.value)}
                placeholder="仅记录来源，不自动抓取网站"
              />
            </label>
            <label>
              导入 TXT / Markdown
              <input
                type="file"
                accept=".txt,.md"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f)
                    void act("读取文件", async () => {
                      if (f.size > 80000)
                        throw new Error("文件过大，请控制在 80 KB 以内。");
                      setKnowledge(await f.text());
                      if (!title) setTitle(f.name);
                    });
                }}
              />
            </label>
            <label>
              知识正文
              <textarea
                rows={7}
                maxLength={20000}
                value={knowledge}
                onChange={(e) => setKnowledge(e.target.value)}
              />
            </label>
            <button
              onClick={() =>
                act("生成知识向量", async () => {
                  const r = await api<{
                    chunks: number;
                    embeddingTokens: number;
                  }>("/api/knowledge", "POST", {
                    title,
                    source: source || "用户提供资料",
                    text: knowledge,
                  });
                  await refresh();
                  setMessage(
                    `已导入 ${r.chunks} 个分块，消耗 ${r.embeddingTokens} 个 Embedding Token。`,
                  );
                  setKnowledge("");
                  setTitle("");
                })
              }
            >
              导入并建立索引
            </button>
            <ul className="lab-items">
              {docs.map((d) => (
                <li key={d.id}>
                  <strong>{d.title}</strong>
                  <span>
                    {d.chunks} 个分块 · {d.source}
                  </span>
                  <button
                    onClick={() =>
                      act("删除文档", async () => {
                        await api(`/api/knowledge?id=${d.id}`, "DELETE");
                        await refresh();
                      })
                    }
                  >
                    删除文档
                  </button>
                </li>
              ))}
            </ul>
            {!docs.length && (
              <p>知识库为空时仍可分析简历，但不会提供知识引用。</p>
            )}
          </section>
          <section className="lab-card">
            <h2>2. 记忆 / Memory</h2>
            <p>
              保存确认过的求职偏好。历史会话摘要带有“模型生成”标签，不作为个人经历证据。
            </p>
            <label>
              偏好与约束
              <textarea
                rows={4}
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例如：2027 年毕业，实习优先沈阳，目标是 AI 产品经理。"
              />
            </label>
            <button
              onClick={() =>
                act("保存记忆", async () => {
                  await api("/api/memory", "POST", {
                    content: note,
                    id: editId,
                  });
                  setNote("");
                  setEditId(undefined);
                  await refresh();
                })
              }
            >
              {editId ? "更新这条偏好" : "保存偏好"}
            </button>
            {editId && (
              <button
                onClick={() => {
                  setEditId(undefined);
                  setNote("");
                }}
              >
                取消编辑
              </button>
            )}
            <ul className="lab-items">
              {memories.map((m) => (
                <li key={m.id}>
                  <strong>
                    {m.kind === "preference"
                      ? "用户确认偏好"
                      : "模型生成会话摘要 · 未验证"}
                  </strong>
                  <p>{m.content}</p>
                  {m.kind === "preference" && (
                    <button
                      onClick={() => {
                        setEditId(m.id);
                        setNote(m.content);
                      }}
                    >
                      编辑
                    </button>
                  )}
                  <button
                    onClick={() =>
                      act("删除记忆", async () => {
                        await api(`/api/memory?id=${m.id}`, "DELETE");
                        await refresh();
                      })
                    }
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
            {!memories.length && <p>当前没有保存的记忆。</p>}
          </section>
        </div>
        <section className="lab-card">
          <h2>3. 简历 × 岗位分析</h2>
          <div className="lab-columns">
            <label>
              简历文本
              <textarea
                rows={9}
                maxLength={45000}
                value={resume}
                onChange={(e) => setResume(e.target.value)}
              />
            </label>
            <label>
              岗位 JD
              <textarea
                rows={9}
                maxLength={45000}
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="至少 40 个字符，包含职责与任职要求"
              />
            </label>
          </div>
          <label>
            或上传 PDF 简历
            <input
              type="file"
              accept=".pdf"
              onChange={(e) =>
                void act("读取 PDF", () => readPdf(e.target.files?.[0]))
              }
            />
          </label>
          {pdf && (
            <p>
              {pdf.name}{" "}
              <button onClick={() => setPdf(undefined)}>移除 PDF</button>
            </p>
          )}
          <div className="lab-columns">
            <label>
              本次目标城市
              <input
                value={city}
                maxLength={100}
                onChange={(e) => setCity(e.target.value)}
              />
            </label>
            <label>
              本次目标方向
              <input
                value={direction}
                maxLength={100}
                onChange={(e) => setDirection(e.target.value)}
              />
            </label>
          </div>
          <label className="lab-check">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            记住本次分析摘要，供下次使用（默认关闭）
          </label>
          <p>
            简历、PDF 和 JD
            会发送至模型服务。本应用不保存其原文；勾选后只保存目标岗位、差距及下一步任务的摘要，可随时删除。
          </p>
          <button
            className="lab-primary"
            onClick={() =>
              act("运行 Agent", async () => {
                setResult(null);
                const r = await api<AgentRunResponse>(
                  "/api/agent/analyze",
                  "POST",
                  {
                    jdText: jd,
                    resumeText: resume || undefined,
                    resumeFile: pdf,
                    preferences: {
                      targetCity: city,
                      targetDirection: direction,
                    },
                    remember,
                  },
                );
                setResult(r);
                await refresh();
              })
            }
          >
            开始真实分析（消耗 API 额度）
          </button>
        </section>
      </fieldset>
      {result && (
        <section className="lab-card lab-report">
          <h2>分析报告 · {result.analysis.score}/100</h2>
          <p>{result.analysis.executiveSummary}</p>
          <p>{result.analysis.recommendation}</p>
          <p>
            审计：{result.audit.verdict} · 读取记忆 {result.memory.used} 条 ·
            本次记忆{result.memory.saved ? "已保存" : "未保存"}
          </p>
          <p>
            模型 Token：{result.usage.totalTokens} · 检索 Token：
            {result.retrieval.embeddingTokens} · Run ID：{result.runId}
          </p>
          <h3>执行记录</h3>
          <ol>
            {result.trace.map((t, i) => (
              <li key={i}>
                {t.title} — {t.detail}（{t.durationMs} ms）
              </li>
            ))}
          </ol>
          <h3>岗位要求与简历证据</h3>
          <ul>
            {result.analysis.evidenceMatches.map((e, i) => (
              <li key={i}>
                <strong>{e.requirement}</strong> [{e.strength}]：{e.evidence}
              </li>
            ))}
          </ul>
          <h3>补强与行动计划</h3>
          <ul>
            {result.analysis.gaps.map((g, i) => (
              <li key={i}>
                {g.priority} · {g.title}：{g.action}
              </li>
            ))}
          </ul>
          <ol>
            {result.analysis.actionPlan.map((a, i) => (
              <li key={i}>
                {a.day} · {a.title}：{a.deliverable}
              </li>
            ))}
          </ol>
          <h3>知识建议与引用</h3>
          {result.analysis.knowledgeAdvice.map((a, i) => (
            <p key={i}>
              {a.advice} <small>[{a.sourceIds.join(", ")}]</small>
            </p>
          ))}
          {result.retrieval.citations.map((c) => (
            <details key={c.id}>
              <summary>
                {c.title} · 相似度 {c.score} · {c.id}
              </summary>
              <p>来源：{c.source}</p>
              <p>{c.content}</p>
            </details>
          ))}
          {!result.retrieval.citations.length && (
            <p>没有达到阈值的知识片段，本报告不包含 RAG 引用。</p>
          )}
          <h3>面试问题与补充追问</h3>
          <ul>
            {[
              ...result.analysis.interviewQuestions,
              ...result.analysis.followUpQuestions,
            ].map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
          <h3>简历表达建议</h3>
          {result.analysis.resumeEdits.map((e, i) => (
            <p key={i}>
              <strong>{e.section}</strong>：{e.rewrite}
            </p>
          ))}
        </section>
      )}
    </main>
  );
}
