/**
 * Treasury rebalancer entry point.
 *
 * `pnpm start` (or `pnpm dev`) runs the loop indefinitely, ticking every
 * REBALANCE_INTERVAL_SECONDS. Pass `--once` to run a single tick and exit
 * with the appropriate code (useful for cron, smoke tests, and CI).
 */
import 'dotenv/config';
import { loadConfig } from './config.js';
import { buildBundle, runRebalanceTick } from './agent.js';

function log(stage: string, payload: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), stage, ...payload }));
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  const once = process.argv.includes('--once');

  log('boot', {
    apiUrl: cfg.apiUrl,
    walletId: cfg.walletId,
    intentMode: cfg.intentMode,
    intervalMs: cfg.intervalMs,
    driftThresholdBps: cfg.driftThresholdBps,
    targets: cfg.targets,
    once,
  });

  const bundle = await buildBundle(cfg);

  if (once) {
    const decision = await runRebalanceTick(cfg, bundle);
    process.exitCode = decision.kind === 'noop' ? 0 : 0; // noop and leg both exit 0 by design
    return;
  }

  let stopping = false;
  process.on('SIGINT', () => {
    stopping = true;
    log('shutdown', { signal: 'SIGINT' });
  });
  process.on('SIGTERM', () => {
    stopping = true;
    log('shutdown', { signal: 'SIGTERM' });
  });

  while (!stopping) {
    try {
      await runRebalanceTick(cfg, bundle);
    } catch (error) {
      log('tick.error', { error: String(error) });
    }
    if (stopping) break;
    await new Promise<void>((resolve) => setTimeout(resolve, cfg.intervalMs));
  }
}

main().catch((error) => {
  console.error('treasury-rebalancer crashed', error);
  process.exit(1);
});
