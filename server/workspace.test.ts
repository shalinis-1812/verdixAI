import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { calculateRiskScore, calculateSubscores } from "../shared/risk";
import { getReportPayload, getSystemStatus } from "./db";
import type { CaseDetail } from "../shared/types";
import type { TrpcContext } from "./_core/context";

const signal = (status: "MATCH" | "MISMATCH" | "SUSPICIOUS", weight: number, severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "HIGH") => ({ code: "test", label: "Test signal", severity, weight, description: "Synthetic test signal", status, evidence: "A / B" });

function unauthenticatedContext(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

const sampleDetail: CaseDetail = {
  id: 1, caseId: "VRX-2026-TEST", fullName: "Synthetic Person", syntheticId: "SYN-TEST", documentType: "Passport", score: 74, riskLevel: "HIGH", status: "needs_review", decision: "Held for manual verification", recommendedAction: "Manual Verification Required", createdAt: new Date().toISOString(),
  document: { filename: "synthetic.png", issueDate: "2024-01-01", expiryDate: "2030-01-01", extractedText: "Synthetic Person", metadata: { source: "synthetic" } },
  identity: { fullName: "Synthetic Person", dateOfBirth: "1990-01-01", nationality: "Indian", documentNumber: "SYN-0001", documentType: "Passport", expiryDate: "2030-01-01", faceReference: "FACE-SYN-TEST" },
  subscores: { documentIntegrity: 40, identityConfidence: 46, dataConsistency: 33, forensicConfidence: 59 },
  evidence: [{ id: "1", code: "dob-mrz", label: "DOB / MRZ alignment", severity: "CRITICAL", status: "MISMATCH", weight: 26, description: "Synthetic mismatch", location: "MRZ zone", valueA: "1990-01-01", valueB: "1990-01-02" }],
  events: [{ stage: "Decision", status: "completed", occurredAt: new Date().toISOString(), durationMs: 120, detail: "Synthetic result" }],
};

describe("VERIDEX AI risk model", () => {
  it("keeps matched signals at low risk", () => {
    const result = calculateRiskScore([signal("MATCH", 80)]);
    expect(result.score).toBe(0);
    expect(result.level).toBe("LOW");
  });

  it("weights mismatches and returns manual review language", () => {
    const result = calculateRiskScore([signal("MISMATCH", 72, "CRITICAL"), signal("SUSPICIOUS", 25, "HIGH")]);
    expect(result.score).toBe(88);
    expect(result.level).toBe("CRITICAL");
    expect(result.recommendedAction).toContain("Manual Verification");
    expect(calculateSubscores([signal("MISMATCH", 72, "CRITICAL")]).dataConsistency).toBeLessThan(50);
  });
});

describe("workspace contracts", () => {
  it("labels each engine with an explicit operating mode", () => {
    const engines = getSystemStatus();
    expect(engines.length).toBeGreaterThan(4);
    expect(engines.every((engine) => engine.mode === "REAL MODEL" || engine.mode === "DEMO / FALLBACK MODE")).toBe(true);
  });

  it("includes the synthetic-data disclaimer in report payloads", () => {
    const report = getReportPayload(sampleDetail);
    expect(report.notice).toContain("Synthetic Data Only");
    expect(report.disclaimer).toContain("Not an official Government of India website");
    expect(report.evidence[0]?.status).toBe("MISMATCH");
  });

  it("blocks unauthenticated workspace procedures", async () => {
    const caller = appRouter.createCaller(unauthenticatedContext());
    await expect(caller.dashboard.summary()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
