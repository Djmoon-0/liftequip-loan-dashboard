import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  int,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const importBatches = mysqlTable("import_batches", {
  id: serial("id").primaryKey(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  source: varchar("source", { length: 64 }).notNull().default("excel-upload"),
  rowCount: int("row_count").notNull().default(0),
  status: varchar("status", { length: 32 }).notNull().default("completed"),
  note: text("note"),
  importedAt: timestamp("imported_at").notNull().defaultNow(),
});

export const loanRecords = mysqlTable(
  "loan_records",
  {
    id: serial("id").primaryKey(),
    recordHash: varchar("record_hash", { length: 64 }).notNull(),
    sourceSheet: varchar("source_sheet", { length: 64 }).notNull(),
    issueDate: date("issue_date"),
    empNo: varchar("emp_no", { length: 64 }),
    borrowerName: varchar("borrower_name", { length: 255 }),
    contactNumber: varchar("contact_number", { length: 64 }),
    contractor: varchar("contractor", { length: 255 }),
    department: varchar("department", { length: 255 }),
    vessel: varchar("vessel", { length: 255 }),
    mainCode: varchar("main_code", { length: 64 }),
    subCode: varchar("sub_code", { length: 64 }),
    voucherNo: varchar("voucher_no", { length: 64 }),
    equipmentNo: varchar("equipment_no", { length: 128 }),
    ownerDistinctive: varchar("owner_distinctive", { length: 128 }),
    manufacturedYear: varchar("manufactured_year", { length: 16 }),
    description: text("description"),
    qty: int("qty").notNull().default(1),
    lastLoadTestDate: date("last_load_test_date"),
    momExpiryDate: date("mom_expiry_date"),
    returnDate: date("return_date"),
    returnStatusRaw: varchar("return_status_raw", { length: 128 }),
    statusCategory: varchar("status_category", { length: 32 }).notNull().default("unknown"),
    damageReport: text("damage_report"),
    batchId: int("batch_id"),
    importedAt: timestamp("imported_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    recordHashIdx: uniqueIndex("loan_record_hash_idx").on(table.recordHash),
    statusIdx: index("loan_status_idx").on(table.statusCategory),
    vesselIdx: index("loan_vessel_idx").on(table.vessel),
    equipmentIdx: index("loan_equipment_idx").on(table.equipmentNo),
    issueDateIdx: index("loan_issue_date_idx").on(table.issueDate),
    momExpiryIdx: index("loan_mom_expiry_idx").on(table.momExpiryDate),
  }),
);

export type LoanRecord = typeof loanRecords.$inferSelect;
export type InsertLoanRecord = typeof loanRecords.$inferInsert;
export type ImportBatch = typeof importBatches.$inferSelect;
