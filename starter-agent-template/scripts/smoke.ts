/**
 * Standalone smoke test for the starter template.
 *
 * Strategy:
 *   1. Copy the template into a temp directory (without node_modules / dist /
 *      pnpm-lock).
 *   2. If the @keeta-agent-stack/* packages are present in the parent monorepo
 *      (the typical PR / local case), build & pack them and rewrite the
 *      template's dependencies to point at the resulting tgz files via
 *      `file:` URLs. This is how we verify packaging without needing the
 *      packages to already be on npm.
 *   3. If the parent monorepo is not present (e.g. the template was copied
 *      somewhere else by a user), fall back to a regular `pnpm install`
 *      from the public registry.
 *   4. Run `pnpm install --ignore-workspace && pnpm build` and assert success.
 *
 * CI runs this on every PR (see .github/workflows/template-smoke.yml).
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = resolve(here, '..');
const monorepoPackagesDir = join(repoRoot, 'packages');
const work = mkdtempSync(join(tmpdir(), 'keeta-starter-smoke-'));

/**
 * Direct dependencies declared by the template's package.json. The smoke test
 * still installs from these names, but pnpm.overrides redirects them (and
 * their transitive @keeta-agent-stack/* deps) to local tarballs.
 */
const TEMPLATE_DEPS = [
  '@keeta-agent-stack/types',
  '@keeta-agent-stack/sdk',
  '@keeta-agent-stack/agent-runtime',
];

/**
 * Full transitive closure of @keeta-agent-stack/* packages used by the template
 * deps. We pack every one and inject pnpm.overrides so workspace:* references
 * (already converted to "0.0.1" by pnpm pack) resolve to local tarballs
 * instead of the public registry.
 */
const ALL_INTERNAL_PACKAGES = [
  '@keeta-agent-stack/types',
  '@keeta-agent-stack/utils',
  '@keeta-agent-stack/wallet',
  '@keeta-agent-stack/config',
  '@keeta-agent-stack/policy',
  '@keeta-agent-stack/adapter-base',
  '@keeta-agent-stack/adapter-mock-dex',
  '@keeta-agent-stack/adapter-mock-cex',
  '@keeta-agent-stack/adapter-mock-anchor',
  '@keeta-agent-stack/adapter-solana-stub',
  '@keeta-agent-stack/adapter-template',
  '@keeta-agent-stack/adapter-keeta-transfer',
  '@keeta-agent-stack/adapter-oracle-rail',
  '@keeta-agent-stack/adapter-registry',
  '@keeta-agent-stack/keeta',
  '@keeta-agent-stack/simulator',
  '@keeta-agent-stack/routing',
  '@keeta-agent-stack/sdk',
  '@keeta-agent-stack/agent-runtime',
];

function run(cmd: string, args: string[], cwd: string): void {
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', env: process.env });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} (in ${cwd}) exited with ${res.status}`);
  }
}

function packageDir(name: string): string {
  // Convention: @keeta-agent-stack/foo lives in packages/foo
  const short = name.replace(/^@keeta-agent-stack\//, '');
  return join(monorepoPackagesDir, short);
}

function localPackagesAvailable(): boolean {
  return ALL_INTERNAL_PACKAGES.every((name) => existsSync(join(packageDir(name), 'package.json')));
}

function topologicallySortPackages(packageNames: string[]): string[] {
  const remaining = new Set(packageNames);
  const built = new Set<string>();
  const ordered: string[] = [];

  while (remaining.size > 0) {
    let progressed = false;
    for (const name of [...remaining]) {
      const pkg = JSON.parse(readFileSync(join(packageDir(name), 'package.json'), 'utf8')) as {
        dependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
      };
      const deps = {
        ...(pkg.dependencies ?? {}),
        ...(pkg.peerDependencies ?? {}),
      };
      const internalDeps = Object.keys(deps).filter(
        (dep) => dep.startsWith('@keeta-agent-stack/') && packageNames.includes(dep)
      );
      if (internalDeps.every((dep) => built.has(dep))) {
        ordered.push(name);
        built.add(name);
        remaining.delete(name);
        progressed = true;
      }
    }

    if (!progressed) {
      throw new Error(`Unable to determine smoke build order for: ${[...remaining].join(', ')}`);
    }
  }

  return ordered;
}

function buildAndPackAll(): Record<string, string> {
  const tarballs: Record<string, string> = {};
  for (const name of topologicallySortPackages(ALL_INTERNAL_PACKAGES)) {
    run('pnpm', ['--filter', name, 'build'], repoRoot);
  }
  for (const name of ALL_INTERNAL_PACKAGES) {
    const dir = packageDir(name);
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
      name: string;
      version: string;
    };
    if (!pkg.version) {
      // Some workspace-only utilities (config, utils, wallet) don't ship a
      // build step; skip them — overrides only matter for packages that end
      // up in the closure of the template's runtime deps.
      continue;
    }
    run('pnpm', ['pack', '--pack-destination', work], dir);
    const fileName = `${pkg.name.replace('@', '').replace('/', '-')}-${pkg.version}.tgz`;
    const tarball = join(work, fileName);
    if (!existsSync(tarball)) {
      throw new Error(`Expected tarball not found: ${tarball}`);
    }
    tarballs[name] = `file:${tarball}`;
  }
  return tarballs;
}

try {
  cpSync(here, work, {
    recursive: true,
    filter: (src) => !src.includes('node_modules') && !src.endsWith('/dist'),
  });

  if (existsSync(join(work, 'pnpm-lock.yaml'))) {
    rmSync(join(work, 'pnpm-lock.yaml'));
  }

  if (localPackagesAvailable()) {
    console.log('[smoke] monorepo packages detected — building & packing locally');
    const tarballs = buildAndPackAll();
    const pkgPath = join(work, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      pnpm?: { overrides?: Record<string, string> };
    };
    pkg.dependencies = { ...(pkg.dependencies ?? {}) };
    for (const name of TEMPLATE_DEPS) {
      const ref = tarballs[name];
      if (!ref) throw new Error(`Missing local tarball for ${name}`);
      pkg.dependencies[name] = ref;
    }
    pkg.pnpm = { ...(pkg.pnpm ?? {}), overrides: { ...(pkg.pnpm?.overrides ?? {}), ...tarballs } };
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  } else {
    console.log('[smoke] no monorepo packages — falling back to public registry');
  }

  run('pnpm', ['install', '--ignore-workspace'], work);
  run('pnpm', ['build'], work);

  console.log('starter-agent-template smoke test PASSED');
} finally {
  rmSync(work, { recursive: true, force: true });
}
// Ensure dirname is referenced so eslint doesn't drop the import in some setups.
void dirname;
