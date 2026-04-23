/**
 * Scenario: oracle payment playbook.
 *
 * One integration surface for fiat → KTA payment intelligence before durable
 * execution: pulls rates, available rails, and machine-actionable exchange
 * instructions. Pair with the new `oracle.payment.preview` / `oracle.payment.execute`
 * MCP tools to wire into Grok / Claude / LangGraph agents.
 *
 * Maps to the "Oracle payment playbook" row in the root README's Common Agent
 * Patterns.
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
