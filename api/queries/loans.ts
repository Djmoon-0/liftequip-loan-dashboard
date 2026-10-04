import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "./connection";
import { importBatches, loanRecords, type InsertLoanRecord } from "@db/schema";
import type { DashboardFilter } from "@contracts/loans";

function whereFor(filters?: DashboardFilter) {
  const clauses = [];
  if (filters?.query) {
    const q = `%${filters.query}%`;
    clauses.push(or(
      like(loanRecords.borrowerName, q),
      like(loanRecords.equipmentNo, q),
      like(loanRecords.description, q),
      like(loanRecords.voucherNo, q),
      like(loanRecords.vessel, q),
      like(loanRecords.contractor, q),
    ));
  }
  if (filters?.vessel) clauses.push(eq(loanRecords.vessel, filters.vessel));
  if (filters?.contractor) clauses.push(eq(loanRecords.contractor, filters.contractor));
  if (filters?.status) clauses.push(eq(loanRecords.statusCategory, filters.status));
  return clauses.length ? and(...clauses) : undefined;
}

export async function createImportBatch(fileName: string, note?: string) {
  const [{ id }] = await getDb().insert(importBatches).values({ fileName, note, status: "processing" }).$returningId();
  return id;
}

export async function finishImportBatch(id: number, rowCount: number, status = "completed", note?: string) {
  await getDb().update(importBatches).set({ rowCount, status, note }).where(eq(importBatches.id, id));
}

export async function appendLoanRows(rows: InsertLoanRecord[], batchId?: number) {
  const db = getDb();
  rows = Array.from(new Map(rows.map((row) => [row.recordHash, row])).values());
  const chunk = 500;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk).map((row) => ({ ...row, batchId }));
    if (part.length) await db.insert(loanRecords).values(part);
  }
}

export async function replaceLoanRows(rows: InsertLoanRecord[], batchId?: number) {
  const db = getDb();
  rows = Array.from(new Map(rows.map((row) => [row.recordHash, row])).values());
  await db.delete(loanRecords);
  await appendLoanRows(rows, batchId);
}
export async function getDashboardSummary() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const [totals] = await db.select({
    total: sql<number>`count(*)`,
    loaned: sql<number>`sum(case when status_category in ('loaned','loaned-expired','loaned-lost') then 1 else 0 end)`,
    returned: sql<number>`sum(case when status_category = 'returned' then 1 else 0 end)`,
    damaged: sql<number>`sum(case when status_category like '%damage%' or damage_report is not null and damage_report <> '' then 1 else 0 end)`,
    delayed: sql<number>`sum(case when status_category like '%delay%' then 1 else 0 end)`,
    expiredCert: sql<number>`sum(case when mom_expiry_date is not null and mom_expiry_date < ${today} then 1 else 0 end)`,
    expiringSoon: sql<number>`sum(case when mom_expiry_date is not null and mom_expiry_date between ${today} and ${soon} then 1 else 0 end)`,
    lost: sql<number>`sum(case when status_category like '%lost%' then 1 else 0 end)`,
  }).from(loanRecords);

  const byStatus = await db.select({ name: loanRecords.statusCategory, value: sql<number>`count(*)` }).from(loanRecords).groupBy(loanRecords.statusCategory).orderBy(desc(sql`count(*)`));
  const byVessel = await db.select({ name: loanRecords.vessel, value: sql<number>`count(*)` }).from(loanRecords).groupBy(loanRecords.vessel).orderBy(desc(sql`count(*)`)).limit(14);
  const byContractor = await db.select({ name: loanRecords.contractor, value: sql<number>`count(*)` }).from(loanRecords).groupBy(loanRecords.contractor).orderBy(desc(sql`count(*)`)).limit(12);
  const byEquipment = await db.select({ name: loanRecords.description, value: sql<number>`count(*)` }).from(loanRecords).groupBy(loanRecords.description).orderBy(desc(sql`count(*)`)).limit(12);
  const monthly = await db.select({ month: sql<string>`date_format(issue_date, '%Y-%m')`, issued: sql<number>`count(*)`, returned: sql<number>`sum(case when return_date is not null then 1 else 0 end)` }).from(loanRecords).groupBy(sql`date_format(issue_date, '%Y-%m')`).orderBy(sql`date_format(issue_date, '%Y-%m')`);

  return { totals, byStatus, byVessel, byContractor, byEquipment, monthly };
}

export async function listLoanRecords(filters?: DashboardFilter) {
  return getDb().select().from(loanRecords).where(whereFor(filters)).orderBy(desc(loanRecords.issueDate), desc(loanRecords.id)).limit(filters?.limit ?? 120);
}

export async function getFilterOptions() {
  const db = getDb();
  const vessels = await db.selectDistinct({ value: loanRecords.vessel }).from(loanRecords).orderBy(loanRecords.vessel).limit(200);
  const contractors = await db.selectDistinct({ value: loanRecords.contractor }).from(loanRecords).orderBy(loanRecords.contractor).limit(200);
  const statuses = await db.selectDistinct({ value: loanRecords.statusCategory }).from(loanRecords).orderBy(loanRecords.statusCategory);
  return {
    vessels: vessels.map((x) => x.value).filter((v): v is string => Boolean(v)),
    contractors: contractors.map((x) => x.value).filter((v): v is string => Boolean(v)),
    statuses: statuses.map((x) => x.value).filter((v): v is string => Boolean(v)),
  };
}

export async function latestImport() {
  return getDb().select().from(importBatches).orderBy(desc(importBatches.importedAt)).limit(8);
}
