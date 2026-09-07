"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RunState = "idle" | "running" | "done";

const workflow = [
  {
    id: "01",
    title: "读取记忆与解析",
    detail: "并行读取历史偏好、解析简历与岗位",
  },
  {
    id: "02",
    title: "检索参考知识",
    detail: "岗位需求向量检索，保留片段与来源编号",
  },
  {
    id: "03",
    title: "覆盖率工具",
    detail: "用确定性代码计算关键词覆盖",
  },
  {
    id: "04",
    title: "匹配策略生成",
    detail: "生成证据映射、能力差距与行动建议",
  },
  {
    id: "05",
    title: "审计与条件路由",
    detail: "依据审计结果直接输出、修订一次或追问",
  },
  {
    id: "06",
    title: "按需保存摘要",
    detail: "用户勾选后保存带有未验证标签的摘要",
  },
];

const evidence = [
  {
    strength: "strong",
    label: "强证据",
    requirement: "模型理解与数据分析",
    proof:
      "完成 CARLA、PPO、CBF-QP 对比实验，使用成功率、碰撞率与 near-miss 评价策略表现。",
    confidence: 92,
  },
  {
    strength: "partial",
    label: "部分证据",
    requirement: "Agent 产品设计",
    proof:
      "搭建过 Coze 对话原型，具备 Prompt、角色和流程意识，但缺少工具调用与代码级状态编排。",
    confidence: 71,
  },
  {
    strength: "missing",
    label: "证据缺失",
    requirement: "真实用户与迭代结果",
    proof:
      "材料中没有用户访谈、可用性测试或版本迭代前后的量化结果，不能推断为已具备。",
    confidence: 96,
  },
];

const competencies = [
  { name: "模型理解", score: 89, note: "算法研究形成技术判断基础" },
  { name: "评测思维", score: 91, note: "基线、指标和异常场景经验突出" },
  { name: "Agent 实践", score: 67, note: "有原型，工程闭环仍需补强" },
  { name: "用户证据", score: 38, note: "缺少真实用户研究与反馈" },
  { name: "产品表达", score: 73, note: "具备结构化问题拆解能力" },
];

const gaps = [
  {
    priority: "P0",
    title: "补齐真实用户验证",
    action: "完成 5 位目标用户访谈，输出问题清单与需求优先级。",
  },
  {
    priority: "P0",
    title: "建立 Agent 评测集",
    action: "设计 50 条正常、边界与风险用例，对比两个版本。",
  },
  {
    priority: "P1",
    title: "强化工程可讲述性",
    action: "补充检查点、人工介入、异常兜底和 Token 成本记录。",
  },
];

const evalMetrics = [
  {
    index: "01",
    title: "要求召回率",
    detail: "JD 的职责、硬门槛与加分项是否完整识别",
  },
  {
    index: "02",
    title: "证据可追溯率",
    detail: "每个高分结论能否定位到简历原始事实",
  },
  {
    index: "03",
    title: "无依据陈述率",
    detail: "审计前后虚构经历与虚高分数是否下降",
  },
  {
    index: "04",
    title: "建议可执行性",
    detail: "建议是否包含任务、时间和明确交付物",
  },
  {
    index: "05",
    title: "成本与延迟",
    detail: "记录节点耗时、Token 使用与修订触发率",
  },
];

const productDecisions = [
  {
    title: "LangGraph 显式编排",
    detail:
      "用共享状态、并行节点和条件边表达执行逻辑，让每次路由都有清晰依据并可被测试。",
    tag: "ORCHESTRATION",
  },
  {
    title: "PDF 只解析一次",
    detail:
      "简历解析与 JD 拆解并行执行，后续节点只消费结构化证据，降低重复输入成本。",
    tag: "COST",
  },
  {
    title: "确定性工具负责计算",
    detail:
      "关键词覆盖率交给代码工具，模型只做语义判断，避免让 LLM 凭感觉计算。",
    tag: "RELIABILITY",
  },
  {
    title: "审计失败才修订",
    detail:
      "最多触发一次修订，防止无限循环，在结果质量、延迟和成本之间做取舍。",
    tag: "ROUTING",
  },
  {
    title: "区分材料与记忆",
    detail:
      "不保存简历与 JD 原文；偏好和知识资料持久化，会话摘要默认不保存且可删除。",
    tag: "PRIVACY",
  },
  {
    title: "RAG 不冒充个人证据",
    detail:
      "知识库只辅助方法建议，引用必须对应本次检索片段；历史摘要不作为已完成经历。",
    tag: "GROUNDING",
  },
];

export default function Home() {
  const [runState, setRunState] = useState<RunState>("done");
  const [activeStep, setActiveStep] = useState(workflow.length);

  useEffect(() => {
    if (runState !== "running") return;
    const timers = workflow.map((_, index) =>
      window.setTimeout(
        () => {
          setActiveStep(index + 1);
          if (index === workflow.length - 1) setRunState("done");
        },
        520 * (index + 1),
      ),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [runState]);

  const playDemo = () => {
    setActiveStep(0);
    setRunState("running");
    window.setTimeout(() => {
      document
        .getElementById("sample")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  };

  return (
    <main className="showcase-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="返回顶部">
          <span>AI</span>
          <div>
            <strong>AIMatch Agent</strong>
            <small>AI PRODUCT PORTFOLIO · 2026</small>
          </div>
        </a>
        <nav aria-label="作品导航">
          <a href="#problem">产品问题</a>
          <a href="#workflow">Agent 机制</a>
          <a href="#sample">样例演示</a>
          <a href="#evaluation">评测设计</a>
          <a href="#about">我的职责</a>
          <Link href="/lab">私有工作台</Link>
        </nav>
        <button className="header-action" onClick={playDemo}>
          播放样例
          <span aria-hidden="true">↗</span>
        </button>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="hero-label">
            <span>AI 产品经理作品集</span>
            <i />
            <span>LangGraph 状态图 Agent</span>
          </div>
          <h1>
            让岗位匹配结论
            <br />
            <em>有证据，也有审计。</em>
          </h1>
          <p>
            AIMatch Agent
            是一个面向校招与实习场景的求职决策智能体。它不只输出一个匹配分数，
            还会解释证据、识别能力缺口、生成行动计划，通过 RAG
            和记忆补充上下文，并审计无依据结论。
          </p>
          <div className="hero-actions">
            <button className="primary-action" onClick={playDemo}>
              体验脱敏样例
              <span aria-hidden="true">→</span>
            </button>
            <a className="secondary-action" href="#workflow">
              查看产品机制
            </a>
          </div>
          <p className="hero-disclaimer">
            公开页使用合成材料演示，不收集或分析访问者的真实简历。
          </p>
        </div>

        <div className="hero-board" aria-label="AIMatch Agent 报告预览">
          <div className="board-topline">
            <span>SYNTHETIC SAMPLE / 01</span>
            <strong>合成审计结果预览</strong>
          </div>
          <div className="board-score">
            <div>
              <strong>74</strong>
              <span>/100</span>
            </div>
            <p>
              技术理解与评测方法形成差异化，
              <br />
              用户证据和长期状态恢复仍需补强。
            </p>
          </div>
          <div className="board-bars">
            {competencies.slice(0, 4).map((item) => (
              <div key={item.name}>
                <span>{item.name}</span>
                <i>
                  <b style={{ width: `${item.score}%` }} />
                </i>
                <strong>{item.score}</strong>
              </div>
            ))}
          </div>
          <div className="board-footer">
            <span>10 GRAPH NODES</span>
            <span>3 ROUTES</span>
            <span>8 EVAL CASES</span>
          </div>
        </div>
      </section>

      <section className="number-strip" aria-label="项目概览">
        <article>
          <strong>10</strong>
          <span>LangGraph 注册节点</span>
        </article>
        <article>
          <strong>03</strong>
          <span>审计后的条件路由</span>
        </article>
        <article>
          <strong>08</strong>
          <span>合成评测场景</span>
        </article>
        <article>
          <strong>00</strong>
          <span>简历原文落库</span>
        </article>
      </section>

      <section className="problem-section" id="problem">
        <div className="section-intro">
          <p className="eyebrow">01 · PRODUCT PROBLEM</p>
          <h2>求职者缺的不是另一个“匹配分”，而是可信的决策依据。</h2>
          <p>
            普通简历匹配工具经常把复杂岗位压缩成一个百分比，却没有说明证据来源、
            判断边界和下一步行动。这个项目从三个可验证的问题出发。
          </p>
        </div>
        <div className="problem-grid">
          <article>
            <span>01</span>
            <h3>分数不可解释</h3>
            <p>
              用户不知道分数从哪里来，也无法判断是技能匹配还是关键词碰巧命中。
            </p>
            <strong>→ 证据逐条映射</strong>
          </article>
          <article>
            <span>02</span>
            <h3>模型容易过度推断</h3>
            <p>
              低代码原型、课程经历或研究项目，可能被错误包装成完整产品经验。
            </p>
            <strong>→ 独立证据审计</strong>
          </article>
          <article>
            <span>03</span>
            <h3>建议无法执行</h3>
            <p>“提升产品能力”过于宽泛，不能帮助求职者决定本周先完成什么。</p>
            <strong>→ 任务与交付物</strong>
          </article>
        </div>
      </section>

      <section className="workflow-section" id="workflow">
        <div className="dark-heading">
          <p className="eyebrow">02 · AGENT WORKFLOW</p>
          <h2>解析、RAG、记忆、工具与条件路由。</h2>
          <p>
            六个阶段概览对应底层 10 个注册节点。LangGraph
            管理共享状态、并行节点和条件边，
            中间穿插检索与确定性工具，最终由审计结果决定是否修订或追问。
          </p>
        </div>

        <div className="workflow-map">
          {workflow.map((step, index) => (
            <div className="workflow-item" key={step.id}>
              <article>
                <span>{step.id}</span>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
              </article>
              {index < workflow.length - 1 ? <i aria-hidden="true">→</i> : null}
            </div>
          ))}
        </div>

        <div className="route-map" aria-label="条件路由">
          <div>
            <span>CRITIC VERDICT</span>
            <strong>证据审计</strong>
          </div>
          <i aria-hidden="true">→</i>
          <article>
            <b>PASS</b>
            <span>直接输出报告</span>
          </article>
          <article>
            <b>REVISE</b>
            <span>修订一次后输出</span>
          </article>
          <article>
            <b>NEED INPUT</b>
            <span>向用户补充追问</span>
          </article>
        </div>
      </section>

      <section className="sample-section" id="sample">
        <div className="sample-heading">
          <div>
            <p className="eyebrow">03 · INTERACTIVE SAMPLE</p>
            <h2>一份脱敏合成材料，如何变成可执行的求职策略。</h2>
          </div>
          <div>
            <span>SYNTHETIC DATA</span>
            <p>
              以下内容仅展示产品交互和信息结构，不代表真实候选人或线上模型结果。
            </p>
          </div>
        </div>

        <div className="sample-workspace">
          <aside className="sample-input">
            <div className="sample-panel-title">
              <span>INPUT</span>
              <strong>合成候选人 × AI 产品经理 JD</strong>
            </div>

            <div className="document-card">
              <div>
                <span>RESUME</span>
                <strong>技术型转产品候选人</strong>
              </div>
              <p>
                电子信息硕士，研究强化学习与自动驾驶安全决策；完成 Coze
                情绪陪伴原型，尚未开展用户测试。
              </p>
              <ul>
                <li>CARLA / PPO / CBF-QP</li>
                <li>基线、消融与异常场景</li>
                <li>Coze / Prompt 原型</li>
              </ul>
            </div>

            <div className="document-card jd">
              <div>
                <span>JOB DESCRIPTION</span>
                <strong>大模型应用产品经理</strong>
              </div>
              <p>
                负责需求洞察、Agent
                工作流设计、产品迭代和效果评测；与算法研发协作， 通过用户反馈与
                bad case 持续优化。
              </p>
            </div>

            <button
              className="run-sample"
              onClick={playDemo}
              disabled={runState === "running"}
            >
              {runState === "running" ? "样例工作流运行中" : "重播 Agent 样例"}
              <span aria-hidden="true">
                {runState === "running" ? "···" : "↗"}
              </span>
            </button>
          </aside>

          <div className="sample-output">
            <div className="trace-header">
              <div>
                <span>AGENT TRACE</span>
                <strong>可观察执行链路</strong>
              </div>
              <b className={runState}>
                {runState === "running"
                  ? `运行中 ${activeStep}/${workflow.length}`
                  : "样例已完成"}
              </b>
            </div>

            <div className="trace-list">
              {workflow.map((step, index) => {
                const complete = activeStep > index;
                const current = runState === "running" && activeStep === index;
                return (
                  <article
                    key={step.id}
                    className={`${complete ? "complete" : ""} ${
                      current ? "current" : ""
                    }`}
                  >
                    <span>{step.id}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.detail}</p>
                    </div>
                    <b>{complete ? "✓" : current ? "RUN" : "WAIT"}</b>
                  </article>
                );
              })}
            </div>

            <div
              className={`sample-report ${
                runState === "running" ? "processing" : ""
              }`}
            >
              <div className="report-score">
                <strong>74</strong>
                <span>/100 · 中等偏高匹配</span>
                <p>
                  可投递，但应把“算法评测方法如何迁移到 AI 产品”讲清楚，
                  并补齐用户验证与代码级 Agent 证据。
                </p>
              </div>

              <div className="competency-list">
                {competencies.map((item) => (
                  <div key={item.name}>
                    <span>{item.name}</span>
                    <i>
                      <b style={{ width: `${item.score}%` }} />
                    </i>
                    <strong>{item.score}</strong>
                    <small>{item.note}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="evidence-section">
          <div className="subsection-title">
            <div>
              <span>EVIDENCE MATRIX</span>
              <h3>岗位要求 × 简历证据</h3>
            </div>
            <p>每个结论都说明证据强度，不把缺失信息包装成优势。</p>
          </div>
          <div className="evidence-grid">
            {evidence.map((item) => (
              <article key={item.requirement}>
                <span className={item.strength}>{item.label}</span>
                <h4>{item.requirement}</h4>
                <p>{item.proof}</p>
                <footer>
                  <span>CONFIDENCE</span>
                  <strong>{item.confidence}%</strong>
                </footer>
              </article>
            ))}
          </div>
        </div>

        <div className="gap-section">
          <div className="subsection-title">
            <div>
              <span>GAP QUEUE</span>
              <h3>差距不是结论，是任务队列</h3>
            </div>
            <p>按面试影响排序，并给出可检查的交付物。</p>
          </div>
          <div className="gap-list">
            {gaps.map((gap) => (
              <article key={gap.title}>
                <span>{gap.priority}</span>
                <strong>{gap.title}</strong>
                <p>{gap.action}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="evaluation-section" id="evaluation">
        <div className="section-intro">
          <p className="eyebrow">04 · EVALUATION DESIGN</p>
          <h2>先定义成功标准，再讨论模型“好不好用”。</h2>
          <p>
            项目已建立 8 个不含真实个人信息的合成场景，覆盖强匹配、算法转产品、
            年限幻觉、无关岗位、英文简历、低代码边界和简历内指令注入。
            评测协议已经完成，真实结果将在私有运行环境中产生。
          </p>
        </div>

        <div className="metric-grid">
          {evalMetrics.map((metric) => (
            <article key={metric.index}>
              <span>{metric.index}</span>
              <strong>{metric.title}</strong>
              <p>{metric.detail}</p>
            </article>
          ))}
        </div>

        <div className="eval-status">
          <div>
            <span>DATASET</span>
            <strong>8 synthetic cases</strong>
          </div>
          <i />
          <div>
            <span>BASELINE</span>
            <strong>without critic</strong>
          </div>
          <i />
          <div>
            <span>EXPERIMENT</span>
            <strong>critic + repair loop</strong>
          </div>
          <i />
          <div>
            <span>PUBLIC CLAIM</span>
            <strong>no fabricated metrics</strong>
          </div>
        </div>
      </section>

      <section className="decision-section">
        <div className="dark-heading">
          <p className="eyebrow">05 · PRODUCT DECISIONS</p>
          <h2>不是堆技术，而是明确每个取舍解决什么问题。</h2>
        </div>
        <div className="decision-grid">
          {productDecisions.map((decision, index) => (
            <article key={decision.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>{decision.tag}</b>
              <h3>{decision.title}</h3>
              <p>{decision.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section" id="about">
        <div className="about-copy">
          <p className="eyebrow">06 · MY ROLE</p>
          <h2>从问题定义，到 Agent 编排，再到评测与发布。</h2>
          <p>
            这是一个面向 AI
            产品经理求职的独立作品。我负责产品问题定义、信息架构、 并通过 AI
            辅助编程完成 LangGraph 状态编排、RAG、Memory、交互和自动化测试。
            真实 API 效果与用户价值仍需独立验证，代码生成不替代理解与评测。
          </p>
          <div className="role-tags">
            <span>产品定义</span>
            <span>Agent 架构</span>
            <span>LangGraph</span>
            <span>RAG + Memory</span>
            <span>LLM Evals</span>
            <span>交互原型</span>
            <span>Vibe Coding</span>
          </div>
        </div>

        <div className="timeline">
          <article>
            <span>V1</span>
            <div>
              <strong>规则型作品原型</strong>
              <p>验证报告结构、核心场景和信息层级。</p>
            </div>
          </article>
          <article>
            <span>V2</span>
            <div>
              <strong>真实 Agent 工程</strong>
              <p>增加 PDF 输入、模型节点、确定性工具、审计与修订分支。</p>
            </div>
          </article>
          <article>
            <span>V3</span>
            <div>
              <strong>LangGraph 状态图重构</strong>
              <p>将手写流程迁移为共享状态、并行节点和条件路由的显式图。</p>
            </div>
          </article>
          <article>
            <span>V4</span>
            <div>
              <strong>RAG 与持久化 Memory</strong>
              <p>加入知识分块、向量检索、来源校验、偏好管理与可选会话摘要。</p>
            </div>
          </article>
          <article className="next">
            <span>NEXT</span>
            <div>
              <strong>私有真实评测与用户验证</strong>
              <p>运行 8 个合成案例，对比基线与审计版本并补充可用性测试。</p>
            </div>
          </article>
        </div>
      </section>

      <section className="final-cta">
        <div>
          <p className="eyebrow">AI PRODUCT MANAGER PORTFOLIO</p>
          <h2>用产品问题定义技术，而不是用技术包装 Demo。</h2>
        </div>
        <button onClick={playDemo}>
          再看一次样例
          <span aria-hidden="true">↗</span>
        </button>
      </section>

      <footer className="site-footer">
        <div className="brand">
          <span>AI</span>
          <div>
            <strong>AIMatch Agent</strong>
            <small>Evidence over vibes.</small>
          </div>
        </div>
        <p>2027 届 AI 产品经理候选人 · 独立产品作品</p>
        <span>PUBLIC SHOWCASE · 2026</span>
      </footer>
    </main>
  );
}
