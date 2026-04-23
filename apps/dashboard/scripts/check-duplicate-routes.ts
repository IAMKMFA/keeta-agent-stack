#!/usr/bin/env node
/**
 * Walks apps/dashboard/app/, resolves the final URL path for every page.tsx
 * and route.ts by stripping Next App Router group segments ((foo)) and private
 * segments (_foo), and fails if two files map to the same URL path.
 *
 * Also fails if any client component (files containing "use client") constructs
 * an EventSource with an upstream-api URL expression — browsers must connect
 * only to dashboard-owned proxy routes.
 *
 * Exit code is non-zero on any violation so CI / `pnpm test` can gate on it.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, '..', 'app');
const COMPONENTS_ROOT = path.resolve(SCRIPT_DIR, '..', 'components');

interface RouteFile {
  urlPath: string;
  sourcePath: string;
  kind: 'page' | 'route';
}

async function* walk(root: string): AsyncGenerator<string> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      yield* walk(abs);
    } else if (entry.isFile()) {
      yield abs;
    }
  }
}

function segmentToUrl(segment: string): string | null {
  if (segment.startsWith('(') && segment.endsWith(')')) return '';
  if (segment.startsWith('_')) return null;
  if (segment === 'page.tsx' || segment === 'page.ts') return '';
  if (segment === 'route.tsx' || segment === 'route.ts') return '';
  return segment;
}

function resolveUrlPath(absFile: string): { urlPath: string; kind: 'page' | 'route' } | null {
  const rel = path.relative(APP_ROOT, absFile).split(path.sep);
  const leaf = rel[rel.length - 1];
  if (!leaf) return null;

  const isPage = leaf === 'page.tsx' || leaf === 'page.ts';
  const isRoute = leaf === 'route.tsx' || leaf === 'route.ts';
  if (!isPage && !isRoute) return null;

  const parts: string[] = [];
  for (let i = 0; i < rel.length - 1; i++) {
    const seg = rel[i];
    if (seg == null) continue;
    const mapped = segmentToUrl(seg);
    if (mapped === null) return null;
    if (mapped !== '') parts.push(mapped);
  }
  const urlPath = '/' + parts.join('/');
  return { urlPath: urlPath === '/' ? '/' : urlPath, kind: isPage ? 'page' : 'route' };
}

async function collectRouteFiles(): Promise<RouteFile[]> {
  const out: RouteFile[] = [];
  for await (const abs of walk(APP_ROOT)) {
    const resolved = resolveUrlPath(abs);
    if (!resolved) continue;
    out.push({ urlPath: resolved.urlPath, sourcePath: abs, kind: resolved.kind });
  }
  return out;
}

async function findEventSourceLeaks(): Promise<string[]> {
  const leaks: string[] = [];
  for await (const abs of walk(COMPONENTS_ROOT)) {
    if (!abs.endsWith('.tsx') && !abs.endsWith('.ts')) continue;
    const content = await fs.readFile(abs, 'utf8');
    if (!content.includes("'use client'") && !content.includes('"use client"')) continue;
    const eventSourceCalls = content.matchAll(/new\s+EventSource\s*\(\s*([^)]+)\)/g);
    for (const m of eventSourceCalls) {
      const arg = m[1] ?? '';
      const isRelativeProxy = /^['"]\/api\//.test(arg.trim());
      if (!isRelativeProxy) {
        leaks.push(
          `${path.relative(process.cwd(), abs)}: EventSource argument must be a relative "/api/..." proxy path. Got: ${arg.trim()}`
        );
      }
    }
  }
  return leaks;
}

async function main(): Promise<void> {
  const files = await collectRouteFiles();
  const byUrl = new Map<string, RouteFile[]>();
  for (const f of files) {
    const key = `${f.kind}:${f.urlPath}`;
    const list = byUrl.get(key) ?? [];
    list.push(f);
    byUrl.set(key, list);
  }

  const collisions: string[] = [];
  for (const [key, list] of byUrl) {
    if (list.length > 1) {
      const [kind, url] = key.split(':');
      collisions.push(
        `Duplicate Next App Router ${kind} path "${url}":\n` +
          list.map((f) => `  - ${path.relative(process.cwd(), f.sourcePath)}`).join('\n')
      );
    }
  }

  const eventSourceLeaks = await findEventSourceLeaks();

  if (collisions.length === 0 && eventSourceLeaks.length === 0) {
    console.log(
      `check-duplicate-routes: OK (${files.length} route files scanned, 0 collisions, 0 EventSource leaks)`
    );
    return;
  }

  if (collisions.length > 0) {
    console.error('\n[route-collision]');
    for (const c of collisions) console.error(c);
  }
  if (eventSourceLeaks.length > 0) {
    console.error('\n[eventsource-leak]');
    for (const l of eventSourceLeaks) console.error('  - ' + l);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
