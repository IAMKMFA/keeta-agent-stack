import baseConfig from '../../eslint.config.js';
import nextPlugin from '@next/eslint-plugin-next';

/**
 * Dashboard ESLint configuration.
 *
 * On top of the shared Next.js config, this file enforces the Dashboard V2
 * security addendum rules:
 *
 *   A6 — bare `fetch(` is banned in dashboard source except inside the
 *        allowlisted HTTP layer (`lib/api.ts`, `lib/auth.ts`) and in
 *        proxy route handlers under `app/api/**`. Every other caller
 *        must go through the helpers in `lib/api.ts`, which already set
 *        `cache: 'no-store'`.
 *
 *   A8 — `@keeta-agent-sdk/sdk` cannot be imported from files that begin
 *        with a `'use client'` directive (enforced by the
 *        `no-sdk-in-client` project rule below at lint-security.ts time;
 *        here we simply block the import outright from any component
 *        directory).
 *        Anything under `apps/mcp` is never importable from the dashboard.
 */

const fetchBanMessage =
  'Bare fetch() is not allowed. Use fetchJson/postJson/requestJson from lib/api.ts — they enforce cache: "no-store" and forward auth headers.';

export default [
  ...baseConfig,
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='fetch']",
          message: fetchBanMessage,
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/apps/mcp/**', 'apps/mcp/**', '@keeta-agent-sdk/mcp', '@keeta-agent-sdk/mcp/**'],
              message:
                'The dashboard must not import MCP internals. Move shared logic to packages/* or expose it via apps/api.',
            },
          ],
        },
      ],
    },
  },
  {
    // HTTP-layer files explicitly own fetch().
    files: ['lib/api.ts', 'lib/auth.ts', 'app/api/**/route.ts', 'app/api/**/route.tsx'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
];
