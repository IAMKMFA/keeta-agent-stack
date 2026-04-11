import type { Database } from '../db';
import { balanceSnapshots } from '../schema/balances';
import { eq } from 'drizzle-orm';

export async function listBalancesForWallet(db: Database, walletId: string) {
  return db
    .select()
    .from(balanceSnapshots)
    .where(eq(balanceSnapshots.walletId, walletId));
}
