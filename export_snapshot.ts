import 'dotenv/config';
import fs from 'node:fs';
import { getDashboardSummary, getFilterOptions, latestImport, listLoanRecords } from './api/queries/loans';
const snapshot = {
  generatedAt: new Date().toISOString(),
  summary: await getDashboardSummary(),
  options: await getFilterOptions(),
  imports: await latestImport(),
  records: await listLoanRecords({ limit: 500 }),
};
fs.writeFileSync('/tmp/liftequip_snapshot.json', JSON.stringify(snapshot));
console.log('exported', snapshot.records.length, 'records');
process.exit(0);
