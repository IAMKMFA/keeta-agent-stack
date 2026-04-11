import { eq } from 'drizzle-orm';
import type { Database } from '../db';
import { portfolioState } from '../schema/portfolio';

export async function upsertPortfolioState(
  db: Database,
  walletId: string,
  payload: Record<string, unknown>
) {
  const existing = await db
    .select()
    .from(portfolioState)
    .where(eq(portfolioState.walletId, walletId))
    .limit(1);
  if (existing[0]) {
    const [r] = await db
      .update(portfolioState)
      .set({ payload, updatedAt: new Date() })
      .where(eq(portfolioState.walletId, walletId))
      .returning();
    return r;
  }
  const [r] = await db.insert(portfolioState).values({ walletId, payload }).returning();
  return r;
}

export async function getPortfolioState(db: Database, walletId: string) {
  const rows = await db.select().from(portfolioState).where(eq(portfolioState.walletId, walletId)).limit(1);
  return rows[0];
}
