import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { inferSyntheticRow, modelSummary, parseSyntheticUpload } from "./inference";
import { extractDocumentFromImage, parseDocumentExtraction } from "./documentVision";

const genuineRow = {
  document_type: "Passport", ocr_match: "Yes", mrz_match: "Yes", data_consistency: "Yes",
  face_match_percent: 98.2, document_integrity_score: 95.1, identity_confidence_score: 97.4,
  data_consistency_score: 96.2, forensic_confidence_score: 94.8, synthetic_name: "TEST PERSON",
  synthetic_dob: "01-01-1990", observed_name_ocr: "TEST PERSON", observed_dob_ocr: "01-01-1990",
};

const manipulatedRow = { ...genuineRow, ocr_match: "No", mrz_match: "No", data_consistency: "No", face_match_percent: 72, document_integrity_score: 34, forensic_confidence_score: 29 };

describe("dataset-backed unseen inference", () => {
  it("scores a clean unseen synthetic row as low risk", () => {
    const result = inferSyntheticRow(genuineRow);
    expect(result.modelVersion).toBe("veridex-synthetic-logistic-v1");
    expect(result.score).toBeLessThan(35);
    expect(result.level).toBe("LOW");
    expect(result.signals.some((signal) => signal.status === "MATCH")).toBe(true);
  });

  it("returns high-confidence explainable signals for a manipulated unseen row", () => {
    const result = inferSyntheticRow(manipulatedRow);
    expect(result.score).toBeGreaterThanOrEqual(65);
    expect(["HIGH", "CRITICAL"]).toContain(result.level);
    expect(result.signals.filter((signal) => signal.status !== "MATCH").length).toBeGreaterThan(2);
  });

  it("rejects rows missing required model features", () => {
    expect(() => inferSyntheticRow({ document_type: "Passport" })).toThrow(/Missing required synthetic fields/);
  });

  it("rejects unsupported photo formats before vision processing", async () => {
    await expect(extractDocumentFromImage("document.pdf", "application/pdf", "ZmFrZQ==")).rejects.toThrow(/JPG, PNG, or WEBP/);
  });

  it("rejects empty or malformed photo extraction payloads safely", async () => {
    await expect(extractDocumentFromImage("document.jpg", "image/jpeg", "")).rejects.toThrow(/empty or larger/);
    expect(() => parseDocumentExtraction("not-json")).toThrow();
  });

  it("normalizes a successful structured vision extraction", () => {
    const parsed = parseDocumentExtraction(JSON.stringify({ documentType: "Passport", fullName: "SYNTHETIC PERSON", dateOfBirth: "01-01-1990", expiryDate: "01-01-2030", documentNumber: "SYN-1", nationality: "Indian", ocrConfidence: 87, mrzPresent: true, mrzConsistent: false, fieldsConsistent: false, tamperCues: ["possible edit"], extractionNotes: "Review manually" }));
    expect(parsed.documentType).toBe("Passport");
    expect(parsed.ocrConfidence).toBe(87);
    expect(parsed.tamperCues).toContain("possible edit");
  });

  it("parses the supplied durable workbook and produces a model-backed result", () => {
    const workbookPath = path.join(process.cwd(), "server", "data", "VERIDEX_AI_Synthetic_Dataset_1000.xlsx");
    const base64 = fs.readFileSync(workbookPath).toString("base64");
    const rows = parseSyntheticUpload("VERIDEX_AI_Synthetic_Dataset_1000.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", base64);
    const result = inferSyntheticRow(rows[1] ?? {});
    expect(result.modelVersion).toBe("veridex-synthetic-logistic-v1");
    expect(result.signals.every((signal) => signal.description.length > 0)).toBe(true);
  });

  it("parses an uploaded workbook and reports model provenance", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([genuineRow]), "Synthetic Dataset");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const rows = parseSyntheticUpload("unseen-synthetic.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Buffer.from(buffer).toString("base64"));
    expect(rows).toHaveLength(1);
    const summary = modelSummary();
    expect(summary.trainingRows).toBe(1000);
    expect(summary.holdoutAuc).toBeGreaterThan(0.9);
  });
});
