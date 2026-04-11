import { runUpMigrations } from './migrations.js';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required');
  await runUpMigrations(url);
  console.log('Migrations complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
