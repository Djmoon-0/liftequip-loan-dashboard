import "dotenv/config";
import fs from "node:fs";
import { getDb } from "../api/queries/connection";
import { importBatches, loanRecords, type InsertLoanRecord } from "./schema";

const FILE = "/mnt/agents/output/app/db/seed_rows.jsonl";

async function main() {
  const lines = fs.readFileSync(FILE, "utf8").split(/\r?\n/).filter(Boolean);
  console.log("lines", lines.length);
  const [{ id: batchId }] = await getDb().insert(importBatches).values({ fileName: "LATEST 2026 DAILY ISSUE FOR LOAN OF L.E.xlsx", rowCount: 0, status: "seeding", note: "Initial workbook import" }).$returningId();
  const db = getDb();
  await db.delete(loanRecords);
  let count = 0;
  const seen = new Set<string>();
  const parsed = lines.map((line) => JSON.parse(line) as InsertLoanRecord).filter((row) => {
    if (seen.has(row.recordHash)) return false;
    seen.add(row.recordHash);
    return true;
  });
  console.log("unique", parsed.length);
  for (let i = 0; i < parsed.length; i += 100) {
    const batch = parsed.slice(i, i + 100).map((row) => ({ ...row, batchId }));
    await db.insert(loanRecords).values(batch);
    count += batch.length;
    if (count % 1000 === 0 || count === parsed.length) console.log(`seeded ${count}`);
  }
  await db.update(importBatches).set({ rowCount: count, status: "seeded" });
  console.log(`done ${count}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
