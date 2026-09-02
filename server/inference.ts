import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import type { RiskSeverity, SignalStatus } from "../shared/risk";

export type UploadedSyntheticRow = Record<string, unknown>;

type ModelArtifact = {
  artifactVersion: string;
  featureNames: string[];
  numericFeatures: string[];
  documentTypes: string[];
  means: number[];
  stds: number[];
  weights: number[];
  intercept: number;
  holdoutAccuracy: number;
  holdoutAuc: number;
};

const modelPath = path.join(process.cwd(), "server", "data", "synthetic_model.json");
let cachedModel: ModelArtifact | null = null;

function getModel(): ModelArtifact {
  if (!cachedModel) cachedModel = JSON.parse(fs.readFileSync(modelPath, "utf8")) as ModelArtifact;
  return cachedModel;
}

function normalize(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(row: UploadedSyntheticRow, key: string) {
  const value = Number(row[key]);
  return Number.isFinite(value) ? value : 0;
}

export function parseSyntheticUpload(fileName: string, mimeType: string, base64: string): UploadedSyntheticRow[] {
  if (!base64 || base64.length > 12_000_000) throw new Error("The uploaded file is empty or too large.");
  const buffer = Buffer.from(base64, "base64");
  const extension = path.extname(fileName).toLowerCase();
  if (extension === ".csv" || mimeType.includes("csv")) {
    const workbook = XLSX.read(buffer.toString("utf8"), { type: "string" });
    const first = workbook.SheetNames[0];
    return XLSX.utils.sheet_to_json<UploadedSyntheticRow>(workbook.Sheets[first], { defval: "" });
  }
  if ([".xlsx", ".xls"].includes(extension) || mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames.find((name) => name.toLowerCase().includes("synthetic")) ?? workbook.SheetNames[0];
    if (!sheetName) throw new Error("The workbook does not contain a readable sheet.");
    return XLSX.utils.sheet_to_json<UploadedSyntheticRow>(workbook.Sheets[sheetName], { defval: "" });
  }
  if (extension === ".json" || mimeType.includes("json")) {
    const parsed = JSON.parse(buffer.toString("utf8"));
    const rows = Array.isArray(parsed) ? parsed : parsed.rows;
    if (!Array.isArray(rows)) throw new Error("The JSON file must contain an array of synthetic rows.");
    return rows as UploadedSyntheticRow[];
  }
  throw new Error("Dataset-backed inference currently accepts XLSX, XLS, CSV, or JSON synthetic rows.");
}

function logistic(value: number) { return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, value)))); }

export function inferSyntheticRow(row: UploadedSyntheticRow) {
  const model = getModel();
  const required = ["document_type", "ocr_match", "mrz_match", "data_consistency", "face_match_percent", "document_integrity_score", "identity_confidence_score", "data_consistency_score", "forensic_confidence_score"];
  const missing = required.filter((key) => row[key] === undefined || row[key] === "");
  if (missing.length) throw new Error(`Missing required synthetic fields: ${missing.join(", ")}`);
  const numeric = {
    ocr_match_num: normalize(row.ocr_match).toLowerCase() === "yes" ? 1 : 0,
    mrz_match_num: normalize(row.mrz_match).toLowerCase() === "yes" ? 1 : 0,
    data_consistency_num: normalize(row.data_consistency).toLowerCase() === "yes" ? 1 : 0,
    face_match_percent: numberValue(row, "face_match_percent"),
    document_integrity_score: numberValue(row, "document_integrity_score"),
    identity_confidence_score: numberValue(row, "identity_confidence_score"),
    data_consistency_score: numberValue(row, "data_consistency_score"),
    forensic_confidence_score: numberValue(row, "forensic_confidence_score"),
  };
  const vector = model.featureNames.map((name) => name.startsWith("document_type=") ? (name.slice("document_type=".length) === normalize(row.document_type) ? 1 : 0) : numeric[name as keyof typeof numeric] ?? 0);
  const z = vector.reduce((sum, value, index) => sum + ((value - (model.means[index] ?? 0)) / (model.stds[index] || 1)) * (model.weights[index] ?? 0), model.intercept);
  const probability = logistic(z);
  const score = Math.max(0, Math.min(100, Math.round(probability * 100)));
  const level: RiskSeverity = score >= 85 ? "CRITICAL" : score >= 65 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW";
  const signals = [] as Array<{ code: string; label: string; severity: RiskSeverity; weight: number; description: string; status: SignalStatus; evidence?: string }>;
  const add = (code: string, label: string, severity: RiskSeverity, weight: number, status: SignalStatus, description: string, evidence: string) => signals.push({ code, label, severity, weight, status, description, evidence });
  const ocrMatch = numeric.ocr_match_num === 1;
  const mrzMatch = numeric.mrz_match_num === 1;
  const consistency = numeric.data_consistency_num === 1;
  add("dataset-ocr", "OCR field consistency", "HIGH", 22, ocrMatch ? "MATCH" : "MISMATCH", ocrMatch ? "Observed OCR fields align with the synthetic reference." : "Observed OCR fields do not align with the synthetic reference.", `${normalize(row.observed_name_ocr)} / ${normalize(row.synthetic_name)}`);
  add("dataset-mrz", "MRZ consistency", "CRITICAL", 28, mrzMatch ? "MATCH" : "MISMATCH", mrzMatch ? "MRZ fields align with the synthetic reference." : "MRZ fields do not align with the synthetic reference.", normalize(row.mrz_match));
  add("dataset-data", "Cross-field data consistency", "HIGH", 18, consistency ? "MATCH" : "MISMATCH", consistency ? "Cross-field identity data is consistent." : "Cross-field identity data contains an inconsistency.", `${normalize(row.observed_dob_ocr)} / ${normalize(row.synthetic_dob)}`);
  add("dataset-face", "Face similarity", "MEDIUM", 10, numeric.face_match_percent >= 95 ? "MATCH" : numeric.face_match_percent >= 88 ? "SUSPICIOUS" : "MISMATCH", `Face similarity is ${numeric.face_match_percent.toFixed(1)}% against the synthetic reference.`, `${numeric.face_match_percent.toFixed(1)}%`);
  add("dataset-integrity", "Document integrity score", "HIGH", 14, numeric.document_integrity_score >= 80 ? "MATCH" : numeric.document_integrity_score >= 60 ? "SUSPICIOUS" : "MISMATCH", `Dataset-trained integrity estimate is ${numeric.document_integrity_score.toFixed(1)} / 100.`, `${numeric.document_integrity_score.toFixed(1)} / 100`);
  add("dataset-forensic", "Forensic confidence", "HIGH", 8, numeric.forensic_confidence_score >= 80 ? "MATCH" : numeric.forensic_confidence_score >= 60 ? "SUSPICIOUS" : "MISMATCH", `Dataset-trained forensic confidence is ${numeric.forensic_confidence_score.toFixed(1)} / 100.`, `${numeric.forensic_confidence_score.toFixed(1)} / 100`);
  return { score, level, probability, signals, modelVersion: model.artifactVersion, holdoutAccuracy: model.holdoutAccuracy, holdoutAuc: model.holdoutAuc, row };
}

export function modelSummary() {
  const model = getModel();
  return { artifactVersion: model.artifactVersion, trainingRows: 1000, holdoutAccuracy: model.holdoutAccuracy, holdoutAuc: model.holdoutAuc, documentTypes: model.documentTypes };
}
