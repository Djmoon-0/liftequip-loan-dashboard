import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { dashboardFilterSchema, importBatchSchema } from "@contracts/loans";
import { appendLoanRows, createImportBatch, finishImportBatch, getDashboardSummary, getFilterOptions, latestImport, listLoanRecords, replaceLoanRows } from "./queries/loans";

const ADMIN_KEY = process.env.LOAN_ADMIN_KEY || "lift-admin-2026";

export const loanRouter = createRouter({
  summary: publicQuery.query(() => getDashboardSummary()),
  records: publicQuery.input(dashboardFilterSchema.optional()).query(({ input }) => listLoanRecords(input)),
  filterOptions: publicQuery.query(() => getFilterOptions()),
  latestImport: publicQuery.query(() => latestImport()),
  importExcel: publicQuery.input(importBatchSchema).mutation(async ({ input }) => {
    if (input.adminKey !== ADMIN_KEY) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid admin update key" });
    const rows = input.rows.map((row) => ({
      ...row,
      issueDate: row.issueDate ? new Date(row.issueDate) : null,
      lastLoadTestDate: row.lastLoadTestDate ? new Date(row.lastLoadTestDate) : null,
      momExpiryDate: row.momExpiryDate ? new Date(row.momExpiryDate) : null,
      returnDate: row.returnDate ? new Date(row.returnDate) : null,
    }));
    const batchId = await createImportBatch(input.fileName, "Browser Excel upload");
    try {
      if (input.reset) await replaceLoanRows(rows, batchId);
      else await appendLoanRows(rows, batchId);
      await finishImportBatch(batchId, rows.length, "completed");
      return { ok: true, imported: rows.length, batchId };
    } catch (error) {
      await finishImportBatch(batchId, rows.length, "failed", error instanceof Error ? error.message : "Import failed");
      throw error;
    }
  }),
});
