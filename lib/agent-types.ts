export type AgentStatus = "completed" | "needs_input" | "error";

export type TraceItem = {
  id: string;
  title: string;
  detail: string;
  status: "completed" | "revised" | "needs_input";
  durationMs: number;
};

export type Competency = {
  name: string;
  score: number;
  evidence: string;
  gap: string;
};

export type EvidenceMatch = {
  requirement: string;
  evidence: string;
  strength: "strong" | "partial" | "missing";
  confidence: number;
};

export type GapItem = {
  priority: "P0" | "P1" | "P2";
  title: string;
  impact: string;
  action: string;
};

export type ActionItem = {
  day: string;
  title: string;
  deliverable: string;
};

export type ResumeEdit = {
  section: string;
  issue: string;
  rewrite: string;
};

export type AgentAnalysis = {
  candidateName: string;
  targetRole: string;
  score: number;
  fitLevel: "high" | "medium" | "low";
  executiveSummary: string;
  recommendation: string;
  competencies: Competency[];
  evidenceMatches: EvidenceMatch[];
  gaps: GapItem[];
  actionPlan: ActionItem[];
  interviewQuestions: string[];
  resumeEdits: ResumeEdit[];
  followUpQuestions: string[];
  knowledgeAdvice: Array<{ advice: string; sourceIds: string[] }>;
  assumptions: string[];
};

export type AgentRunResponse = {
  status: AgentStatus;
  runId: string;
  model: string;
  analysis: AgentAnalysis;
  trace: TraceItem[];
  audit: {
    verdict: "pass" | "revised" | "needs_input";
    confidence: number;
    unsupportedClaimsRemoved: number;
    missingEvidence: string[];
  };
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  retrieval: import("./rag").Retrieval;
  memory: { used: number; saved: boolean };
};

export type AgentConfigResponse = {
  configured: boolean;
  model: string;
  framework: "LangGraph";
  memory: "D1";
  rag: "vector";
  publicShowcaseMode: boolean;
  graphNodes: string[];
  workflow: string[];
};
