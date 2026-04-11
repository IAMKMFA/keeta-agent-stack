import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index';

export type Database = ReturnType<typeof drizzle<typeof schema>> & { pool: pg.Pool };

export function createDb(connectionString: string): Database {
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return Object.assign(db, { pool });
}
