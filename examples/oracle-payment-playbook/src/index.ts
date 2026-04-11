/**
 * Golden path: Oracle-first payment planning (rates, rails, exchange instructions)
 * — one integration surface for intelligence before durable execution.
 */
import { buildOraclePaymentPlaybook, KtaOracleClient } from '@keeta-agent-sdk/keeta';

async function main() {
  const client = new KtaOracleClient({
    baseUrl: process.env.KTA_ORACLE_BASE_URL,
    timeoutMs: Number(process.env.KTA_ORACLE_TIMEOUT_MS ?? 10_000),
  });
  const playbook = await buildOraclePaymentPlaybook(client, {
    amount: 100,
    currency: 'USD',
    compareFrom: 'all',
    includeSdkSnippet: true,
    network: 'test',
  });
  console.log(JSON.stringify(playbook, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
