import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  riskSignals,
  screeningCases,
  screeningEvents,
  syntheticDocuments,
  syntheticIdentities,
  InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { calculateRiskScore,
  calculateSubscores,
  type RiskSignalInput,
} from "../shared/risk";
import type { CaseDetail, CaseSummary, DashboardData, EngineStatus, EvidenceItem } from "../shared/types";
import { inferSyntheticRow, modelSummary, parseSyntheticUpload, type UploadedSyntheticRow } from "./inference";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

const identities = [
  { syntheticId: "SYN-IND-1042", fullName: "Aarav Menon", dateOfBirth: "1992-04-18", nationality: "Indian", documentNumber: "P7K4-22-1042", documentType: "Passport", expiryDate: "2031-08-14", faceReference: "FACE-SYN-1042" },
  { syntheticId: "SYN-IND-2198", fullName: "Meera Iyer", dateOfBirth: "1987-11-03", nationality: "Indian", documentNumber: "P3M8-91-2198", documentType: "Passport", expiryDate: "2029-02-21", faceReference: "FACE-SYN-2198" },
  { syntheticId: "SYN-IND-3307", fullName: "Rohan Kapoor", dateOfBirth: "1995-06-27", nationality: "Indian", documentNumber: "D5Q1-44-3307", documentType: "Driving Licence", expiryDate: "2028-12-09", faceReference: "FACE-SYN-3307" },
  { syntheticId: "SYN-IND-4416", fullName: "Ishita Rao", dateOfBirth: "1990-01-12", nationality: "Indian", documentNumber: "P9L2-70-4416", documentType: "Passport", expiryDate: "2032-03-30", faceReference: "FACE-SYN-4416" },
  { syntheticId: "SYN-IND-5821", fullName: "Kabir Nair", dateOfBirth: "1983-09-25", nationality: "Indian", documentNumber: "D2N6-53-5821", documentType: "Driving Licence", expiryDate: "2027-10-18", faceReference: "FACE-SYN-5821" },
  { syntheticId: "SYN-IND-6974", fullName: "Ananya Das", dateOfBirth: "1998-12-01", nationality: "Indian", documentNumber: "P4S7-86-6974", documentType: "Passport", expiryDate: "2033-05-06", faceReference: "FACE-SYN-6974" },
];

const casePlans = [
  { suffix: "001", idx: 0, score: 18, riskLevel: "LOW" as const, status: "completed" as const, decision: "Clear for standard review", variant: "clean" },
  { suffix: "002", idx: 1, score: 43, riskLevel: "MEDIUM" as const, status: "needs_review" as const, decision: "Awaiting analyst review", variant: "expiry" },
  { suffix: "003", idx: 2, score: 71, riskLevel: "HIGH" as const, status: "needs_review" as const, decision: "Held for manual verification", variant: "mismatch" },
  { suffix: "004", idx: 3, score: 91, riskLevel: "CRITICAL" as const, status: "completed" as const, decision: "Escalated to investigation", variant: "critical" },
  { suffix: "005", idx: 4, score: 36, riskLevel: "MEDIUM" as const, status: "completed" as const, decision: "Review supporting evidence", variant: "artifact" },
  { suffix: "006", idx: 5, score: 12, riskLevel: "LOW" as const, status: "completed" as const, decision: "Clear for standard review", variant: "clean" },
];

function createSignals(variant: string): RiskSignalInput[] {
  const base: RiskSignalInput[] = [
    { code: "dob-mrz", label: "DOB / MRZ alignment", severity: "CRITICAL", weight: 26, description: "Date of birth extracted from the visual zone matches the MRZ value.", status: "MATCH", evidence: "1992-04-18 matches 1992-04-18" },
    { code: "name-match", label: "Name consistency", severity: "HIGH", weight: 20, description: "Name fields remain consistent across OCR, MRZ, and the synthetic identity record.", status: "MATCH", evidence: "AARAV MENON" },
    { code: "doc-number", label: "Document number consistency", severity: "HIGH", weight: 18, description: "The document number is consistent across the visual zone and machine-readable zone.", status: "MATCH", evidence: "P7K4-22-1042" },
    { code: "expiry-check", label: "Expiry date check", severity: "MEDIUM", weight: 12, description: "Expiry date is present, legible, and within the expected validity window.", status: "MATCH", evidence: "Valid until 2031-08-14" },
    { code: "mrz-checksum", label: "MRZ checksum", severity: "HIGH", weight: 12, description: "MRZ check digits reconcile with the extracted document fields.", status: "MATCH", evidence: "All checks passed" },
    { code: "photo-artifact", label: "Portrait region artifacts", severity: "MEDIUM", weight: 8, description: "No obvious compositing or replacement artifacts were found in the synthetic portrait region.", status: "MATCH", evidence: "No anomaly detected" },
    { code: "metadata", label: "File metadata review", severity: "LOW", weight: 4, description: "File metadata is compatible with the expected synthetic test input.", status: "MATCH", evidence: "Synthetic capture profile" },
  ];
  if (variant === "expiry") base[3] = { ...base[3], status: "SUSPICIOUS", description: "The expiry date is close to the synthetic policy review threshold.", evidence: "Valid until 2029-02-21" };
  if (variant === "mismatch") {
    base[0] = { ...base[0], status: "MISMATCH", description: "The visual-zone date of birth does not match the MRZ value.", evidence: "Visual 1995-06-27 / MRZ 1995-06-21" };
    base[1] = { ...base[1], status: "SUSPICIOUS", description: "Name token order differs between OCR and the identity record.", evidence: "ROHAN KAPOOR / KAPOOR ROHAN" };
    base[4] = { ...base[4], status: "SUSPICIOUS", evidence: "Check digit requires review" };
  }
  if (variant === "critical") {
    base[0] = { ...base[0], status: "MISMATCH", description: "A material mismatch was found between the document visual zone and its MRZ.", evidence: "Visual 1990-01-12 / MRZ 1990-04-12" };
    base[1] = { ...base[1], status: "MISMATCH", description: "The document name does not align with the synthetic identity record.", evidence: "ISHITA RAO / ISHITA RANA" };
    base[2] = { ...base[2], status: "MISMATCH", description: "Document number differs between the visual zone and MRZ.", evidence: "P9L2-70-4416 / P9L2-70-4418" };
    base[4] = { ...base[4], status: "SUSPICIOUS", evidence: "Two check digits failed" };
    base[5] = { ...base[5], status: "SUSPICIOUS", description: "Portrait region contains a synthetic compositing artifact.", evidence: "Edge discontinuity near portrait border" };
  }
  if (variant === "artifact") {
    base[5] = { ...base[5], status: "SUSPICIOUS", description: "The portrait region contains a low-confidence synthetic artifact.", evidence: "Texture discontinuity at x=284, y=136" };
  }
  return base;
}

function eventRows(caseId: number, baseTime: Date) {
  const stages = [
    ["Uploaded", 340, "Synthetic input accepted"],
    ["Quality Checked", 410, "Resolution and file type validated"],
    ["Classified", 290, "Passport / licence layout identified"],
    ["OCR", 840, "Text fields extracted"],
    ["MRZ", 620, "Machine-readable zone parsed"],
    ["Forensics", 1160, "Visual integrity checks completed"],
    ["Face Verification", 790, "Synthetic face reference compared"],
    ["Consistency", 530, "Identity fields cross-checked"],
    ["Risk Fusion", 370, "Configured evidence weights applied"],
    ["Decision", 120, "Explainable result prepared"],
  ] as const;
  return stages.map(([stage, durationMs, detail], index) => ({
    screeningCaseId: caseId,
    stage,
    status: "completed" as const,
    occurredAt: new Date(baseTime.getTime() + index * 1100),
    durationMs,
    detail,
  }));
}

export async function ensureDemoData() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ id: screeningCases.id }).from(screeningCases).limit(1);
  if (existing.length) return;
  await db.insert(syntheticIdentities).values(identities);
  const savedIdentities = await db.select().from(syntheticIdentities).orderBy(syntheticIdentities.id);
  await db.insert(syntheticDocuments).values(savedIdentities.map((identity) => ({
    identityId: identity.id,
    documentType: identity.documentType,
    filename: `${identity.syntheticId.toLowerCase()}-synthetic.${identity.documentType === "Passport" ? "png" : "pdf"}`,
    issueDate: "2024-05-16",
    expiryDate: identity.expiryDate,
    extractedText: `${identity.fullName}\nDOB ${identity.dateOfBirth}\nNATIONALITY ${identity.nationality}\nDOC ${identity.documentNumber}\nEXP ${identity.expiryDate}`,
    metadataJson: { source: "synthetic", captureProfile: "DEMO-2026", dimensions: "1200 x 760", checksum: "synthetic-only" },
  })));
  const savedDocuments = await db.select().from(syntheticDocuments).orderBy(syntheticDocuments.id);
  const savedCases = [] as Array<typeof screeningCases.$inferInsert>;
  for (const plan of casePlans) {
    const identity = savedIdentities[plan.idx];
    const document = savedDocuments[plan.idx];
    savedCases.push({
      caseId: `VRX-2026-${plan.suffix}`,
      identityId: identity.id,
      documentId: document.id,
      score: plan.score,
      riskLevel: plan.riskLevel,
      status: plan.status,
      decision: plan.decision,
      recommendedAction: plan.riskLevel === "LOW" ? "Proceed with standard verification checks" : plan.riskLevel === "MEDIUM" ? "Review supporting evidence before decision" : "Manual Verification Required",
      evidenceJson: createSignals(plan.variant),
      subscoresJson: calculateSubscores(createSignals(plan.variant)),
    });
  }
  await db.insert(screeningCases).values(savedCases);
  const insertedCases = await db.select().from(screeningCases).orderBy(screeningCases.id);
  for (let i = 0; i < insertedCases.length; i += 1) {
    const row = insertedCases[i];
    const signals = createSignals(casePlans[i]?.variant ?? "clean");
    await db.insert(riskSignals).values(signals.map((signal) => ({
      screeningCaseId: row.id,
      code: signal.code,
      label: signal.label,
      severity: signal.severity,
      weight: signal.weight,
      description: signal.description,
      status: signal.status,
      evidenceJson: { evidence: signal.evidence ?? "" },
    })));
    await db.insert(screeningEvents).values(eventRows(row.id, new Date(row.createdAt)));
  }
}

function toCaseSummary(row: any): CaseSummary {
  return {
    id: row.caseIdValue,
    caseId: row.caseId,
    fullName: row.fullName,
    syntheticId: row.syntheticId,
    documentType: row.documentType,
    score: row.score,
    riskLevel: row.riskLevel,
    status: row.status,
    decision: row.decision,
    recommendedAction: row.recommendedAction,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export async function listCaseSummaries(): Promise<CaseSummary[]> {
  const db = await getDb();
  if (!db) return [];
  await ensureDemoData();
  const rows = await db.select({
    caseIdValue: screeningCases.id,
    caseId: screeningCases.caseId,
    fullName: syntheticIdentities.fullName,
    syntheticId: syntheticIdentities.syntheticId,
    documentType: syntheticIdentities.documentType,
    score: screeningCases.score,
    riskLevel: screeningCases.riskLevel,
    status: screeningCases.status,
    decision: screeningCases.decision,
    recommendedAction: screeningCases.recommendedAction,
    createdAt: screeningCases.createdAt,
  }).from(screeningCases).innerJoin(syntheticIdentities, eq(screeningCases.identityId, syntheticIdentities.id)).orderBy(desc(screeningCases.createdAt));
  return rows.map((row) => toCaseSummary(row));
}

function parseSignals(value: unknown): EvidenceItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((signal: any, index) => ({
    id: `${signal.code ?? "signal"}-${index}`,
    code: signal.code ?? "unknown",
    label: signal.label ?? "Unnamed signal",
    severity: signal.severity ?? "LOW",
    status: signal.status ?? "UNKNOWN",
    weight: Number(signal.weight ?? 0),
    description: signal.description ?? "No additional explanation is available.",
    location: signal.code === "photo-artifact" ? "Portrait region" : signal.code === "dob-mrz" || signal.code === "mrz-checksum" ? "MRZ zone" : "Visual zone",
    valueA: signal.evidence?.split("/")[0]?.trim(),
    valueB: signal.evidence?.split("/")[1]?.trim(),
  }));
}

export async function getCaseDetail(caseId: string): Promise<CaseDetail | null> {
  const db = await getDb();
  if (!db) return null;
  await ensureDemoData();
  const rows = await db.select({
    caseRow: screeningCases,
    identity: syntheticIdentities,
    document: syntheticDocuments,
  }).from(screeningCases)
    .innerJoin(syntheticIdentities, eq(screeningCases.identityId, syntheticIdentities.id))
    .innerJoin(syntheticDocuments, eq(screeningCases.documentId, syntheticDocuments.id))
    .where(eq(screeningCases.caseId, caseId)).limit(1);
  const row = rows[0];
  if (!row) return null;
  const signals = await db.select().from(riskSignals).where(eq(riskSignals.screeningCaseId, row.caseRow.id)).orderBy(desc(riskSignals.weight));
  const events = await db.select().from(screeningEvents).where(eq(screeningEvents.screeningCaseId, row.caseRow.id)).orderBy(screeningEvents.id);
  const summary = toCaseSummary({
    caseIdValue: row.caseRow.id,
    caseId: row.caseRow.caseId,
    fullName: row.identity.fullName,
    syntheticId: row.identity.syntheticId,
    documentType: row.identity.documentType,
    score: row.caseRow.score,
    riskLevel: row.caseRow.riskLevel,
    status: row.caseRow.status,
    decision: row.caseRow.decision,
    recommendedAction: row.caseRow.recommendedAction,
    createdAt: row.caseRow.createdAt,
  });
  return {
    ...summary,
    document: {
      filename: row.document.filename,
      issueDate: row.document.issueDate,
      expiryDate: row.document.expiryDate,
      extractedText: row.document.extractedText,
      metadata: (row.document.metadataJson as Record<string, string>) ?? {},
    },
    identity: {
      fullName: row.identity.fullName,
      dateOfBirth: row.identity.dateOfBirth,
      nationality: row.identity.nationality,
      documentNumber: row.identity.documentNumber,
      documentType: row.identity.documentType,
      expiryDate: row.identity.expiryDate,
      faceReference: row.identity.faceReference,
    },
    subscores: (row.caseRow.subscoresJson as any) ?? calculateSubscores([]),
    evidence: signals.map((signal) => ({
      id: String(signal.id),
      code: signal.code,
      label: signal.label,
      severity: signal.severity,
      status: signal.status,
      weight: signal.weight,
      description: signal.description,
      location: signal.code === "photo-artifact" ? "Portrait region" : signal.code.includes("mrz") ? "MRZ zone" : "Visual zone",
      valueA: (signal.evidenceJson as any)?.evidence?.split("/")[0]?.trim(),
      valueB: (signal.evidenceJson as any)?.evidence?.split("/")[1]?.trim(),
    })),
    events: events.map((event) => ({ stage: event.stage, status: event.status, occurredAt: event.occurredAt.toISOString(), durationMs: event.durationMs, detail: event.detail })),
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const db = await getDb();
  if (!db) return { metrics: { todayCount: 0, low: 0, medium: 0, high: 0, critical: 0, avgProcessingMs: 0, queueCount: 0, reviewCount: 0 }, distribution: [], recentCases: [], recentAlerts: [], syntheticIdentities: [] };
  await ensureDemoData();
  const cases = await listCaseSummaries();
  const allEvents = await db.select().from(screeningEvents);
  const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  cases.forEach((item) => { counts[item.riskLevel] += 1; });
  const todayCount = cases.filter((item) => new Date(item.createdAt).toDateString() === new Date().toDateString()).length || cases.length;
  const avgProcessingMs = allEvents.length ? Math.round(allEvents.reduce((sum, event) => sum + event.durationMs, 0) / Math.max(1, new Set(allEvents.map((event) => event.screeningCaseId)).size)) : 0;
  const identityRows = await db.select({ id: syntheticIdentities.id, syntheticId: syntheticIdentities.syntheticId, fullName: syntheticIdentities.fullName, documentType: syntheticIdentities.documentType }).from(syntheticIdentities).orderBy(syntheticIdentities.id);
  const highCases = cases.filter((item) => item.riskLevel === "HIGH" || item.riskLevel === "CRITICAL").slice(0, 3);
  return {
    metrics: { todayCount, low: counts.LOW, medium: counts.MEDIUM, high: counts.HIGH, critical: counts.CRITICAL, avgProcessingMs, queueCount: cases.filter((item) => item.status === "processing").length, reviewCount: cases.filter((item) => item.status === "needs_review").length },
    distribution: [
      { label: "Low", value: counts.LOW, color: "#2E7D32" },
      { label: "Medium", value: counts.MEDIUM, color: "#E67E22" },
      { label: "High", value: counts.HIGH, color: "#B7473A" },
      { label: "Critical", value: counts.CRITICAL, color: "#7F1D1D" },
    ],
    recentCases: cases.slice(0, 5),
    recentAlerts: highCases.map((item) => ({ title: `${item.caseId} requires attention`, detail: `${item.score} / 100 — ${item.recommendedAction}`, severity: item.riskLevel, caseId: item.caseId })),
    syntheticIdentities: identityRows,
  };
}

export async function createScreeningCase(identityId: number, manipulationCodes: string[]) {
  const db = await getDb();
  if (!db) return null;
  await ensureDemoData();
  const identity = (await db.select().from(syntheticIdentities).where(eq(syntheticIdentities.id, identityId)).limit(1))[0];
  if (!identity) return null;
  const document = (await db.select().from(syntheticDocuments).where(eq(syntheticDocuments.identityId, identityId)).limit(1))[0];
  if (!document) return null;
  const variant = manipulationCodes.length > 1 ? "critical" : manipulationCodes[0] === "change_dob" || manipulationCodes[0] === "change_name" || manipulationCodes[0] === "change_doc" || manipulationCodes[0] === "modify_mrz" ? "mismatch" : manipulationCodes[0] === "replace_photo" || manipulationCodes[0] === "add_artifact" ? "artifact" : manipulationCodes[0] === "change_expiry" ? "expiry" : "clean";
  const signals = createSignals(variant);
  const result = calculateRiskScore(signals);
  const subscores = calculateSubscores(signals);
  const caseId = `VRX-2026-${String(Date.now()).slice(-6)}`;
  await db.insert(screeningCases).values({
    caseId,
    identityId,
    documentId: document.id,
    score: result.score,
    riskLevel: result.level,
    status: result.level === "LOW" ? "completed" : "needs_review",
    decision: result.level === "LOW" ? "Clear for standard review" : "Held for manual verification",
    recommendedAction: result.recommendedAction,
    evidenceJson: signals,
    subscoresJson: subscores,
  });
  const inserted = (await db.select().from(screeningCases).where(eq(screeningCases.caseId, caseId)).limit(1))[0];
  if (!inserted) return null;
  await db.insert(riskSignals).values(signals.map((signal) => ({ screeningCaseId: inserted.id, code: signal.code, label: signal.label, severity: signal.severity, weight: signal.weight, description: signal.description, status: signal.status, evidenceJson: { evidence: signal.evidence ?? "" } })));
  await db.insert(screeningEvents).values(eventRows(inserted.id, new Date(inserted.createdAt)));
  return getCaseDetail(caseId);
}

export async function createUploadedScreeningCase(fileName: string, mimeType: string, base64: string, rowIndex = 0) {
  const db = await getDb();
  if (!db) return null;
  const rows = parseSyntheticUpload(fileName, mimeType, base64);
  const row: UploadedSyntheticRow | undefined = rows[rowIndex] ?? rows[0];
  if (!row) throw new Error("No synthetic rows were found in the uploaded file.");
  const prediction = inferSyntheticRow(row);
  const now = new Date();
  const syntheticId = `SYN-UPLOAD-${String(Date.now()).slice(-8)}`;
  const documentNumber = String(row.document_id ?? row.observed_document_number ?? syntheticId);
  const identityValues = {
    syntheticId,
    fullName: String(row.synthetic_name ?? row.observed_name_ocr ?? "Synthetic identity"),
    dateOfBirth: String(row.synthetic_dob ?? row.observed_dob_ocr ?? "Unknown"),
    nationality: "Indian",
    documentNumber,
    documentType: String(row.document_type ?? "Synthetic document"),
    expiryDate: String(row.synthetic_expiry ?? row.observed_expiry_ocr ?? "Unknown"),
    faceReference: `FACE-UPLOAD-${String(Date.now()).slice(-6)}`,
  };
  await db.insert(syntheticIdentities).values(identityValues);
  const identity = (await db.select().from(syntheticIdentities).where(eq(syntheticIdentities.syntheticId, syntheticId)).limit(1))[0];
  if (!identity) return null;
  await db.insert(syntheticDocuments).values({
    identityId: identity.id,
    documentType: identity.documentType,
    filename: fileName,
    issueDate: "Dataset row input",
    expiryDate: identity.expiryDate,
    extractedText: Object.entries(row).map(([key, value]) => `${key}: ${String(value)}`).join("\n"),
    metadataJson: { source: "uploaded synthetic dataset", modelVersion: prediction.modelVersion, rowIndex, probability: prediction.probability, holdoutAccuracy: prediction.holdoutAccuracy, holdoutAuc: prediction.holdoutAuc },
  });
  const document = (await db.select().from(syntheticDocuments).where(eq(syntheticDocuments.identityId, identity.id)).orderBy(desc(syntheticDocuments.id)).limit(1))[0];
  if (!document) return null;
  const caseId = `VRX-UPLOAD-${String(Date.now()).slice(-7)}`;
  const level = prediction.level;
  await db.insert(screeningCases).values({
    caseId,
    identityId: identity.id,
    documentId: document.id,
    score: prediction.score,
    riskLevel: level,
    status: level === "LOW" ? "completed" : "needs_review",
    decision: level === "LOW" ? "Dataset model indicates routine review" : "Held for manual verification",
    recommendedAction: level === "LOW" ? "Proceed with standard verification checks" : "Manual Verification Required",
    evidenceJson: prediction.signals,
    subscoresJson: calculateSubscores(prediction.signals),
    createdAt: now,
    updatedAt: now,
  });
  const inserted = (await db.select().from(screeningCases).where(eq(screeningCases.caseId, caseId)).limit(1))[0];
  if (!inserted) return null;
  await db.insert(riskSignals).values(prediction.signals.map((signal) => ({ screeningCaseId: inserted.id, code: signal.code, label: signal.label, severity: signal.severity, weight: signal.weight, description: signal.description, status: signal.status, evidenceJson: { evidence: signal.evidence ?? "", source: "dataset-inference" } })));
  await db.insert(screeningEvents).values(eventRows(inserted.id, now));
  return getCaseDetail(caseId);
}

export async function updateCaseDecision(caseId: string, decision: "reviewed" | "escalated") {
  const db = await getDb();
  if (!db) return null;
  await ensureDemoData();
  const values = decision === "reviewed"
    ? { decision: "Reviewed — no further action", status: "completed" as const, recommendedAction: "Proceed with standard verification checks" }
    : { decision: "Escalated to investigation", status: "needs_review" as const, recommendedAction: "Manual Verification Required" };
  await db.update(screeningCases).set(values).where(eq(screeningCases.caseId, caseId));
  return getCaseDetail(caseId);
}

export function getSimulatorResult(activeCodes: string[]) {
  const signals = createSignals("clean").map((signal): RiskSignalInput => ({ ...signal, status: activeCodes.includes(signal.code) ? (signal.severity === "CRITICAL" ? "MISMATCH" : "SUSPICIOUS") : "MATCH" }));
  const result = calculateRiskScore(signals);
  return { ...result, subscores: calculateSubscores(signals), signals };
}

export function getSystemStatus(): EngineStatus[] {
  const model = modelSummary();
  return [
    { name: "OCR", state: "Operational", mode: "DEMO / FALLBACK MODE", detail: "Synthetic text extraction profile available", latency: "0.84 s" },
    { name: "MRZ Analysis", state: "Operational", mode: "DEMO / FALLBACK MODE", detail: "Checksum and field alignment checks available", latency: "0.62 s" },
    { name: "Forensic Review", state: "Operational", mode: "DEMO / FALLBACK MODE", detail: "Synthetic artifact rules available", latency: "1.16 s" },
    { name: "Face Verification", state: "Standby", mode: "DEMO / FALLBACK MODE", detail: "Uses synthetic face references only", latency: "0.79 s" },
    { name: "Risk Fusion", state: "Operational", mode: "REAL MODEL", detail: `${model.artifactVersion} · ${model.trainingRows} rows · holdout AUC ${(model.holdoutAuc * 100).toFixed(0)}%`, latency: "0.37 s" },
    { name: "Database", state: "Operational", mode: "REAL MODEL", detail: "Persistent synthetic dataset store", latency: "0.09 s" },
  ];
}

export function getReportPayload(detail: CaseDetail) {
  return {
    reportType: "VERIDEX AI Screening Report",
    notice: "Research / Demonstration Prototype — Synthetic Data Only",
    disclaimer: "VERIDEX AI — Demonstration Prototype. Not an official Government of India website.",
    generatedAt: new Date().toISOString(),
    case: { caseId: detail.caseId, syntheticId: detail.syntheticId, documentType: detail.documentType, score: detail.score, riskLevel: detail.riskLevel, recommendedAction: detail.recommendedAction, decision: detail.decision },
    identity: detail.identity,
    document: detail.document,
    evidence: detail.evidence,
    subscores: detail.subscores,
    timeline: detail.events,
  };
}
