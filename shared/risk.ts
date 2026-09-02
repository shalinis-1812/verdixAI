export type RiskSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type SignalStatus = "MATCH" | "MISMATCH" | "SUSPICIOUS" | "UNKNOWN";

export type RiskSignalInput = {
  code: string;
  label: string;
  severity: RiskSeverity;
  weight: number;
  description: string;
  status: SignalStatus;
  evidence?: string;
};

export type Subscores = {
  documentIntegrity: number;
  identityConfidence: number;
  dataConsistency: number;
  forensicConfidence: number;
};

export const SIGNAL_WEIGHTS = {
  dobMrzMismatch: 26,
  nameMismatch: 20,
  documentNumberMismatch: 18,
  expiryAnomaly: 12,
  mrzChecksum: 12,
  photoArtifact: 8,
  metadataAnomaly: 4,
} as const;

export function getRiskLevel(score: number): RiskSeverity {
  if (score >= 85) return "CRITICAL";
  if (score >= 65) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

export function getRecommendedAction(level: RiskSeverity) {
  if (level === "CRITICAL" || level === "HIGH") return "Manual Verification Required";
  if (level === "MEDIUM") return "Review supporting evidence before decision";
  return "Proceed with standard verification checks";
}

export function calculateRiskScore(signals: RiskSignalInput[]) {
  const score = Math.min(100, signals.reduce((sum, signal) => {
    if (signal.status === "MATCH" || signal.status === "UNKNOWN") return sum;
    const multiplier = signal.status === "MISMATCH" ? 1 : 0.65;
    return sum + Math.round(signal.weight * multiplier);
  }, 0));
  const level = getRiskLevel(score);
  return { score, level, recommendedAction: getRecommendedAction(level) };
}

export function calculateSubscores(signals: RiskSignalInput[]): Subscores {
  const score = calculateRiskScore(signals).score;
  const critical = signals.filter((signal) => signal.severity === "CRITICAL" && signal.status !== "MATCH").length;
  const suspicious = signals.filter((signal) => signal.status === "SUSPICIOUS").length;
  return {
    documentIntegrity: Math.max(18, 100 - Math.round(score * 0.82) - suspicious * 3),
    identityConfidence: Math.max(22, 100 - Math.round(score * 0.7) - critical * 6),
    dataConsistency: Math.max(15, 100 - Math.round(score * 0.9)),
    forensicConfidence: Math.max(20, 100 - Math.round(score * 0.55) - suspicious * 5),
  };
}

export function riskBadgeClass(level: RiskSeverity) {
  return {
    LOW: "risk-low",
    MEDIUM: "risk-medium",
    HIGH: "risk-high",
    CRITICAL: "risk-critical",
  }[level];
}
