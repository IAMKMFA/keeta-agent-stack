import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema/index';
import { assets } from './schema/assets';
import { anchorBonds, paymentAnchors } from './schema/payment-anchors';
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

  const templateSeeds = [
    {
      slug: 'paper-trader',
      name: 'Paper trader',
      description: 'Run quote → route → policy → execution in simulate mode (no chain submit).',
      config: { example: 'examples/paper-trader' },
    },
    {
      slug: 'rebalance-bot',
      name: 'Rebalance bot',
      description: 'Skeleton for periodic rebalance intents against registered adapters.',
      config: { example: 'examples/rebalance-bot' },
    },
    {
      slug: 'route-inspector',
      name: 'Route inspector',
      description: 'Inspect scored routes and policy decisions for a given intent.',
      config: { example: 'examples/route-inspector' },
    },
  ];
  for (const t of templateSeeds) {
    const existing = await db.select().from(strategies).where(eq(strategies.slug, t.slug)).limit(1);
    if (existing[0]) continue;
    await db.insert(strategies).values({
      name: t.name,
      slug: t.slug,
      description: t.description,
      isTemplate: true,
      config: t.config as Record<string, unknown>,
    });
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

  const existingAnchor = await db.select().from(paymentAnchors).where(eq(paymentAnchors.adapterId, 'mock-anchor')).limit(1);
  let anchor = existingAnchor[0];
  if (!anchor) {
    const [row] = await db
      .insert(paymentAnchors)
      .values({
        adapterId: 'mock-anchor',
        label: 'Demo Anchor Corridor',
        status: 'active',
        corridorKey: 'USD:AED',
        operatorRef: 'demo-anchor-operator',
        publicLabel: true,
        corridorConfig: { sourceCurrency: 'USD', destinationCurrency: 'AED', region: 'AE' },
        supportedAssets: ['USD', 'AED', 'KTA'],
        commercialTerms: {
          setupFeeNote: 'Demo operator config only',
          volumeFeeBps: 18,
        },
        metadata: { seeded: true },
      })
      .returning();
    anchor = row!;
  }

  if (anchor) {
    const existingBond = await db
      .select()
      .from(anchorBonds)
      .where(eq(anchorBonds.paymentAnchorId, anchor.id))
      .limit(1);
    if (!existingBond[0]) {
      await db.insert(anchorBonds).values({
        paymentAnchorId: anchor.id,
        amountAtomic: '5000000000',
        assetId: 'KTA',
        delayDays: 90,
        status: 'active',
        lockTxHash: 'demo-anchor-bond-lock',
        lockAccount: 'kta_anchor_bond_demo',
        activatedAt: new Date(),
        verified: true,
        verificationSource: 'database',
        verificationDetails: { source: 'seed', note: 'Demo bond for local development' },
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
