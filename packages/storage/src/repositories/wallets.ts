import type { Database } from '../db';
import { wallets } from '../schema/wallets';
import { eq } from 'drizzle-orm';

export async function insertWallet(db: Database, row: typeof wallets.$inferInsert) {
  const [r] = await db.insert(wallets).values(row).returning();
  return r;
}

export async function listWallets(db: Database) {
  return db.select().from(wallets);
}

export async function getWallet(db: Database, id: string) {
  const rows = await db.select().from(wallets).where(eq(wallets.id, id)).limit(1);
  return rows[0];
}

export async function setWalletDefaultPolicyPackId(
  db: Database,
  id: string,
  policyPackId: string | null
) {
  const existing = await getWallet(db, id);
  if (!existing) {
    return null;
  }
  const nextSettings = { ...(existing.settings ?? {}) };
  if (policyPackId === null) {
    delete nextSettings.defaultPolicyPackId;
  } else {
    nextSettings.defaultPolicyPackId = policyPackId;
  }
  const [updated] = await db
    .update(wallets)
    .set({ settings: nextSettings })
    .where(eq(wallets.id, id))
    .returning();
  return updated;
}
