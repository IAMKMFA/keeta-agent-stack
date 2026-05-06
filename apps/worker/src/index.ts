import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { declareRuntime } from '@keeta-agent-stack/custody-guards';
import { runWorkerApp } from './run.js';

// Declare the worker runtime as early as possible. `assertWorkerSigningRuntime()`
// (called inside `createSigningUserClientFromSigner`) reads `KEETA_RUNTIME` at
// signing time; declaring it here means the assertion sees `worker` regardless
// of how the process was launched (`pnpm dev`, `tsx`, `node dist/index.js`).
declareRuntime('worker');

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
