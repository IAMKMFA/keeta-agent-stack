import { runDownMigrations } from './migrations.js';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required');

  await runDownMigrations(url);
  console.log('Rollback complete');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
