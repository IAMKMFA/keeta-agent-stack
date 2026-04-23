#!/usr/bin/env node
/**
 * Dashboard security linter.
 *
 * Phase A8 of the Dashboard V2 Security Addendum. Runs in CI via
 * `pnpm --filter @keeta-agent-sdk/dashboard lint:security` and
 * short-circuits the merge pipeline on any violation.
 *
 * Checks:
 *   1. `OPS_API_KEY` must never appear in a file that begins with a
 *      `'use client'` directive — that would ship a server-only service
 *      credential into the browser bundle.
 *   2. Any `@keeta-agent-sdk/sdk` import in a client-directive file is
 *      rejected for the same reason (the SDK pulls server-only env vars).
 *   3. `.env*` files at the repo root must not declare any
 *      `NEXT_PUBLIC_*` variable whose name matches
 *      `KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL`.
 *   4. Dashboard component props must not be named `jwt`, `apiKey`,
 *      `authorization`, or `opsKey` — these names are almost always a
 *      sign of a credential being funneled through React props.
 *   5. Invokes the duplicate-route script so CI runs both checks from a
 *      single entrypoint.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_ROOT = path.resolve(SCRIPT_DIR, '..');
const REPO_ROOT = path.resolve(DASHBOARD_ROOT, '..', '..');

interface Violation {
  rule: string;
  file: string;
  detail: string;
}

async function* walk(root: string, skip: RegExp[] = []): AsyncGenerator<string> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = path.join(root, entry.name);
    if (skip.some((re) => re.test(abs))) continue;
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
      yield* walk(abs, skip);
    } else if (entry.isFile()) {
      yield abs;
    }
  }
}

function isClientFile(content: string): boolean {
  return /^\s*(['"])use client\1\s*;?/m.test(content.split('\n').slice(0, 5).join('\n'));
}

async function check1And2(): Promise<Violation[]> {
  const violations: Violation[] = [];
  for await (const abs of walk(DASHBOARD_ROOT, [/node_modules/, /\.next/, /tests/, /scripts/])) {
    if (!abs.endsWith('.ts') && !abs.endsWith('.tsx')) continue;
    const content = await fs.readFile(abs, 'utf8');
    if (!isClientFile(content)) continue;
    const codeWithoutComments = content
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n');
    if (/process\.env\.OPS_API_KEY\b/.test(codeWithoutComments)) {
      violations.push({
        rule: 'ops-key-in-client',
        file: path.relative(REPO_ROOT, abs),
        detail: 'OPS_API_KEY referenced in a "use client" file; this ships the key to the browser.',
      });
    }
    if (/from\s+['"]@keeta-agent-sdk\/sdk['"]/.test(content)) {
      violations.push({
        rule: 'sdk-in-client',
        file: path.relative(REPO_ROOT, abs),
        detail:
          '@keeta-agent-sdk/sdk imported from a "use client" file. The SDK is server-only (reads OPS_API_KEY / API_URL).',
      });
    }
  }
  return violations;
}

async function check3(): Promise<Violation[]> {
  const violations: Violation[] = [];
  const candidates: string[] = [];
  const entries = await fs.readdir(REPO_ROOT, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name === '.env' || entry.name.startsWith('.env.')) {
      candidates.push(path.join(REPO_ROOT, entry.name));
    }
  }
  const dangerousRe = /^\s*(NEXT_PUBLIC_[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)[A-Z0-9_]*)\s*=/i;
  for (const file of candidates) {
    const content = await fs.readFile(file, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (/^\s*#/.test(line)) continue;
      const match = line.match(dangerousRe);
      if (match) {
        violations.push({
          rule: 'next-public-secret',
          file: `${path.relative(REPO_ROOT, file)}:${i + 1}`,
          detail: `NEXT_PUBLIC_* names carrying KEY/TOKEN/SECRET/PASSWORD/CREDENTIAL are forbidden — found ${match[1]}.`,
        });
      }
    }
  }
  return violations;
}

async function check4(): Promise<Violation[]> {
  const violations: Violation[] = [];
  const dangerousProps = /\b(jwt|apiKey|authorization|opsKey)\s*:/;
  for await (const abs of walk(path.join(DASHBOARD_ROOT, 'components'), [/node_modules/])) {
    if (!abs.endsWith('.tsx') && !abs.endsWith('.ts')) continue;
    const content = await fs.readFile(abs, 'utf8');
    const interfaceBlocks = content.matchAll(/interface\s+\w*Props\s*\{([\s\S]*?)\}/g);
    for (const block of interfaceBlocks) {
      const body = block[1] ?? '';
      const m = body.match(dangerousProps);
      if (m) {
        violations.push({
          rule: 'dangerous-prop-name',
          file: path.relative(REPO_ROOT, abs),
          detail: `Component Props interface declares a dangerous-looking field: ${m[1]}.`,
        });
      }
    }
    const typeBlocks = content.matchAll(/type\s+\w*Props\s*=\s*\{([\s\S]*?)\}/g);
    for (const block of typeBlocks) {
      const body = block[1] ?? '';
      const m = body.match(dangerousProps);
      if (m) {
        violations.push({
          rule: 'dangerous-prop-name',
          file: path.relative(REPO_ROOT, abs),
          detail: `Component Props type declares a dangerous-looking field: ${m[1]}.`,
        });
      }
    }
  }
  return violations;
}

function runCheckDuplicateRoutes(): Violation[] {
  const scriptPath = path.join(SCRIPT_DIR, 'check-duplicate-routes.ts');
  const result = spawnSync('npx', ['tsx', scriptPath], { encoding: 'utf8' });
  if (result.status === 0) return [];
  const detail = (result.stdout || '') + (result.stderr || '');
  return [
    {
      rule: 'check-duplicate-routes',
      file: path.relative(REPO_ROOT, scriptPath),
      detail: detail.trim() || 'check-duplicate-routes failed',
    },
  ];
}

async function main(): Promise<void> {
  const all: Violation[] = [];
  all.push(...(await check1And2()));
  all.push(...(await check3()));
  all.push(...(await check4()));
  all.push(...runCheckDuplicateRoutes());

  if (all.length === 0) {
    console.log('lint-security: OK');
    return;
  }

  console.error('lint-security: FAILED');
  for (const v of all) {
    console.error(`  [${v.rule}] ${v.file}\n    ${v.detail}`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
