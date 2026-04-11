import type { Database } from '../db';
import { quotes } from '../schema/quotes';

export async function insertQuote(db: Database, row: typeof quotes.$inferInsert) {
  const [r] = await db.insert(quotes).values(row).returning();
  return r;
}
