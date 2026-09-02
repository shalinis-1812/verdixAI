import type { RiskSeverity, SignalStatus, Subscores } from "./risk";

export type EvidenceItem = {
  id: string;
  code: string;
  label: string;
  severity: RiskSeverity;
  status: SignalStatus;
  weight: number;
  description: string;
  location: string;
  valueA?: string;
  valueB?: string;
};

export type CaseSummary = {
  id: number;
  caseId: string;
  fullName: string;
  syntheticId: string;
  documentType: string;
  score: number;
  riskLevel: RiskSeverity;
  status: "completed" | "processing" | "needs_review";
  decision: string;
  recommendedAction: string;
  createdAt: string;
};

export type CaseDetail = CaseSummary & {
  document: {
    filename: string;
    issueDate: string;
    expiryDate: string;
    extractedText: string;
    metadata: Record<string, string>;
  };
  identity: {
    fullName: string;
    dateOfBirth: string;
    nationality: string;
    documentNumber: string;
    documentType: string;
    expiryDate: string;
    faceReference: string;
  };
  subscores: Subscores;
  evidence: EvidenceItem[];
  events: Array<{
    stage: string;
    status: "completed" | "current" | "pending";
    occurredAt: string;
    durationMs: number;
    detail: string;
  }>;
};

export type DashboardData = {
  metrics: {
    todayCount: number;
    low: number;
    medium: number;
    high: number;
    critical: number;
    avgProcessingMs: number;
    queueCount: number;
    reviewCount: number;
  };
  distribution: Array<{ label: string; value: number; color: string }>;
  recentCases: CaseSummary[];
  recentAlerts: Array<{ title: string; detail: string; severity: RiskSeverity; caseId: string }>;
  syntheticIdentities: Array<{ id: number; syntheticId: string; fullName: string; documentType: string }>;
};

export type EngineStatus = {
  name: string;
  state: "Operational" | "Degraded" | "Standby";
  mode: "REAL MODEL" | "DEMO / FALLBACK MODE";
  detail: string;
  latency: string;
};
