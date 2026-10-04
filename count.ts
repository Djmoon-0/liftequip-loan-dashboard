import 'dotenv/config';
import { getDb } from './api/queries/connection';
import { loanRecords, importBatches } from './db/schema';
import { sql, desc } from 'drizzle-orm';
const [c]=await getDb().select({n:sql<number>`count(*)`}).from(loanRecords);
console.log('loan count', c.n);
console.log(await getDb().select().from(importBatches).orderBy(desc(importBatches.id)).limit(5));
process.exit(0);
