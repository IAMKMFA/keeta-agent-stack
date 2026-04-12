import { eq } from 'drizzle-orm';
import type { Database } from '../db';
import { systemSettings } from '../schema/settings';

export const POLICY_DEFAULT_PACK_SETTING_KEY = 'policy.default_pack';

export async function getSetting(db: Database, key: string) {
  const rows = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  return rows[0];
}

export async function upsertSetting(db: Database, key: string, value: Record<string, unknown>) {
  const now = new Date();
  const [r] = await db
    .insert(systemSettings)
    .values({ key, value, updatedAt: now })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: { value, updatedAt: now },
    })
    .returning();
  return r;
}

export async function getDefaultPolicyPackId(db: Database) {
  const row = await getSetting(db, POLICY_DEFAULT_PACK_SETTING_KEY);
  const value = row?.value?.policyPackId;
  return typeof value === 'string' ? value : null;
}
