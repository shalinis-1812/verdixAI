import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const syntheticIdentities = mysqlTable("syntheticIdentities", {
  id: int("id").autoincrement().primaryKey(),
  syntheticId: varchar("syntheticId", { length: 32 }).notNull().unique(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  dateOfBirth: varchar("dateOfBirth", { length: 16 }).notNull(),
  nationality: varchar("nationality", { length: 80 }).notNull(),
  documentNumber: varchar("documentNumber", { length: 48 }).notNull(),
  documentType: varchar("documentType", { length: 40 }).notNull(),
  expiryDate: varchar("expiryDate", { length: 16 }).notNull(),
  faceReference: varchar("faceReference", { length: 80 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const syntheticDocuments = mysqlTable("syntheticDocuments", {
  id: int("id").autoincrement().primaryKey(),
  identityId: int("identityId").notNull(),
  documentType: varchar("documentType", { length: 40 }).notNull(),
  filename: varchar("filename", { length: 160 }).notNull(),
  issueDate: varchar("issueDate", { length: 16 }).notNull(),
  expiryDate: varchar("expiryDate", { length: 16 }).notNull(),
  extractedText: text("extractedText").notNull(),
  metadataJson: json("metadataJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const screeningCases = mysqlTable("screeningCases", {
  id: int("id").autoincrement().primaryKey(),
  caseId: varchar("caseId", { length: 32 }).notNull().unique(),
  identityId: int("identityId").notNull(),
  documentId: int("documentId").notNull(),
  score: int("score").notNull(),
  riskLevel: mysqlEnum("riskLevel", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]).notNull(),
  status: mysqlEnum("status", ["completed", "processing", "needs_review"]).notNull(),
  decision: varchar("decision", { length: 120 }).notNull(),
  recommendedAction: varchar("recommendedAction", { length: 160 }).notNull(),
  evidenceJson: json("evidenceJson").notNull(),
  subscoresJson: json("subscoresJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const riskSignals = mysqlTable("riskSignals", {
  id: int("id").autoincrement().primaryKey(),
  screeningCaseId: int("screeningCaseId").notNull(),
  code: varchar("code", { length: 48 }).notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  severity: mysqlEnum("severity", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]).notNull(),
  weight: int("weight").notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["MATCH", "MISMATCH", "SUSPICIOUS", "UNKNOWN"]).notNull(),
  evidenceJson: json("evidenceJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const screeningEvents = mysqlTable("screeningEvents", {
  id: int("id").autoincrement().primaryKey(),
  screeningCaseId: int("screeningCaseId").notNull(),
  stage: varchar("stage", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["completed", "current", "pending"]).notNull(),
  occurredAt: timestamp("occurredAt").notNull(),
  durationMs: int("durationMs").notNull(),
  detail: varchar("detail", { length: 240 }).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SyntheticIdentity = typeof syntheticIdentities.$inferSelect;
export type SyntheticDocument = typeof syntheticDocuments.$inferSelect;
export type ScreeningCase = typeof screeningCases.$inferSelect;
export type RiskSignal = typeof riskSignals.$inferSelect;
export type ScreeningEvent = typeof screeningEvents.$inferSelect;
