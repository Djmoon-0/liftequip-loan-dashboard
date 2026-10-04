import 'dotenv/config';
import fs from 'node:fs';
import { getDb } from '../api/queries/connection';
import { loanRecords } from './schema';
const rows=fs.readFileSync('db/seed_test.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
console.time('insert');
await getDb().insert(loanRecords).values(rows);
console.timeEnd('insert');
process.exit(0);
