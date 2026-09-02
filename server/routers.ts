import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createScreeningCase,
  getCaseDetail,
  getDashboardData,
  getReportPayload,
  updateCaseDecision,
  getSimulatorResult,
  getSystemStatus,
  listCaseSummaries,
} from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: router({
    summary: protectedProcedure.query(() => getDashboardData()),
  }),
  cases: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional(), riskLevel: z.string().optional(), status: z.string().optional() }).optional()).query(async ({ input }) => {
      const rows = await listCaseSummaries();
      return rows.filter((row) => {
        const search = input?.search?.trim().toLowerCase();
        const searchMatch = !search || `${row.caseId} ${row.fullName} ${row.syntheticId} ${row.documentType}`.toLowerCase().includes(search);
        const riskMatch = !input?.riskLevel || input.riskLevel === "ALL" || row.riskLevel === input.riskLevel;
        const statusMatch = !input?.status || input.status === "ALL" || row.status === input.status;
        return searchMatch && riskMatch && statusMatch;
      });
    }),
    get: protectedProcedure.input(z.object({ caseId: z.string().min(1) })).query(({ input }) => getCaseDetail(input.caseId)),
    screen: protectedProcedure.input(z.object({ identityId: z.number().int().positive(), manipulationCodes: z.array(z.string()).default([]) })).mutation(({ input }) => createScreeningCase(input.identityId, input.manipulationCodes)),
    updateDecision: protectedProcedure.input(z.object({ caseId: z.string().min(1), decision: z.enum(["reviewed", "escalated"]) })).mutation(({ input }) => updateCaseDecision(input.caseId, input.decision)),
    report: protectedProcedure.input(z.object({ caseId: z.string().min(1) })).query(async ({ input }) => {
      const detail = await getCaseDetail(input.caseId);
      return detail ? getReportPayload(detail) : null;
    }),
  }),
  simulator: router({
    preview: protectedProcedure.input(z.object({ activeCodes: z.array(z.string()) })).query(({ input }) => getSimulatorResult(input.activeCodes)),
  }),
  systemStatus: protectedProcedure.query(() => getSystemStatus()),
});

export type AppRouter = typeof appRouter;
