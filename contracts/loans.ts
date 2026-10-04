import { z } from "zod";

const nullableString = z.string().trim().nullable().optional();
const nullableDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional();

export const loanRecordInputSchema = z.object({
  recordHash: z.string().min(8).max(64),
  sourceSheet: z.string().min(1).max(64),
  issueDate: nullableDate,
  empNo: nullableString,
  borrowerName: nullableString,
  contactNumber: nullableString,
  contractor: nullableString,
  department: nullableString,
  vessel: nullableString,
  mainCode: nullableString,
  subCode: nullableString,
  voucherNo: nullableString,
  equipmentNo: nullableString,
  ownerDistinctive: nullableString,
  manufacturedYear: nullableString,
  description: nullableString,
  qty: z.number().int().min(0).max(100000).default(1),
  lastLoadTestDate: nullableDate,
  momExpiryDate: nullableDate,
  returnDate: nullableDate,
  returnStatusRaw: nullableString,
  statusCategory: z.string().min(1).max(32),
  damageReport: nullableString,
});

export const importBatchSchema = z.object({
  fileName: z.string().min(1).max(255),
  adminKey: z.string().min(1).max(128),
  rows: z.array(loanRecordInputSchema).min(1).max(1000),
  reset: z.boolean().default(false),
});

export const dashboardFilterSchema = z.object({
  query: z.string().trim().max(120).optional(),
  vessel: z.string().trim().max(255).optional(),
  status: z.string().trim().max(32).optional(),
  contractor: z.string().trim().max(255).optional(),
  limit: z.number().int().min(10).max(500).default(120),
});

export type LoanRecordInput = z.infer<typeof loanRecordInputSchema>;
export type ImportBatchInput = z.infer<typeof importBatchSchema>;
export type DashboardFilter = z.infer<typeof dashboardFilterSchema>;
