import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWorkerApp } from './run.js';

export { runWorkerApp } from './run.js';

async function main() {
  const shutdown = await runWorkerApp();

  const stop = async () => {
    try {
      await shutdown();
    } catch (error) {
      console.error(error);
    }
    process.exit(0);
  };

  process.on('SIGINT', () => void stop());
  process.on('SIGTERM', () => void stop());
}

const isDirectRun = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
