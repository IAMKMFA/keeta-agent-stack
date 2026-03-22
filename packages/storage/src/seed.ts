import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema/index';
import { assets } from './schema/assets';
import { strategies } from './schema/strategies';
import { wallets } from './schema/wallets';
import { balanceSnapshots } from './schema/balances';
import { eq } from 'drizzle-orm';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required');
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  const assetRows = [
    { symbol: 'KTA', name: 'Keeta', decimals: 8 },
    { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { symbol: 'ETH', name: 'Ether', decimals: 18 },
  ];

  const insertedAssets = [];
  for (const a of assetRows) {
    const existing = await db.select().from(assets).where(eq(assets.symbol, a.symbol)).limit(1);
    if (existing[0]) {
      insertedAssets.push(existing[0]);
    } else {
      const [row] = await db.insert(assets).values(a).returning();
      insertedAssets.push(row!);
    }
  }

  const stratCount = await db.select().from(strategies);
  if (stratCount.length === 0) {
    await db.insert(strategies).values({ name: 'mock-strategy', config: { version: 1 } });
  }

  const existingWallets = await db
    .select()
    .from(wallets)
    .where(eq(wallets.address, 'kta1mock000000000000000000000000000000000'))
    .limit(1);
  let w = existingWallets[0];
  if (!w) {
    const [row] = await db
      .insert(wallets)
      .values({
        label: 'mock-wallet',
        address: 'kta1mock000000000000000000000000000000000',
      })
      .returning();
    w = row!;
  }

  const kta = insertedAssets.find((a) => a?.symbol === 'KTA');
  if (w && kta) {
    const snap = await db
      .select()
      .from(balanceSnapshots)
      .where(eq(balanceSnapshots.walletId, w.id))
      .limit(1);
    if (snap.length === 0) {
      await db.insert(balanceSnapshots).values({
        walletId: w.id,
        assetId: kta.id,
        amount: '1000',
      });
    }
  }

  await pool.end();
  console.log('Seed complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
