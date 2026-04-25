#!/usr/bin/env node
/**
 * Run publint against every publishable workspace package in parallel.
 * Skips packages flagged "private": true (apps and internal-only packages).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { glob } from 'tinyglobby';
import { publint } from 'publint';
import { formatMessage } from 'publint/utils';

const ROOT = resolve(process.cwd());

const candidatePkgPaths = await glob(['packages/*/package.json', 'apps/*/package.json'], {
  cwd: ROOT,
  absolute: true,
  ignore: ['**/node_modules/**'],
});

const targets = [];
for (const pkgPath of candidatePkgPaths) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (pkg.private) continue;
  const dir = pkgPath.replace(/\/package\.json$/, '');
  if (!existsSync(join(dir, 'dist'))) {
    console.log(`skipping ${pkg.name}: dist/ not built (run \`pnpm build\` first)`);
    continue;
  }
  targets.push({ name: pkg.name, dir, pkg });
}

if (targets.length === 0) {
  console.log('no publishable packages with built dist found');
  process.exit(0);
}

let hadError = false;
const results = await Promise.all(
  targets.map(async ({ name, dir, pkg }) => {
    const { messages } = await publint({ pkgDir: dir });
    return { name, dir, pkg, messages };
  })
);

for (const { name, pkg, messages } of results) {
  if (messages.length === 0) {
    console.log(`✓ ${name}`);
    continue;
  }
  const errors = messages.filter((m) => m.type === 'error');
  const warnings = messages.filter((m) => m.type === 'warning');
  const suggestions = messages.filter((m) => m.type === 'suggestion');
  console.log(
    `\n${name}: ${errors.length} error(s), ${warnings.length} warning(s), ${suggestions.length} suggestion(s)`
  );
  for (const msg of messages) {
    console.log(`  [${msg.type}] ${formatMessage(msg, pkg)}`);
  }
  if (errors.length > 0) hadError = true;
}

if (hadError) {
  console.error('\npublint reported errors above. Fix them before publishing.');
  process.exit(1);
}
