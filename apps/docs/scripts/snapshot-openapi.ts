#!/usr/bin/env tsx
/**
 * Snapshot the canonical OpenAPI 3.1 document into `apps/docs/dist/openapi.json`
 * so the static docs bundle (and GitHub Pages deploy) ship the real spec, not
 * an abbreviated summary.
 *
 * `buildOpenApiDocument` is a pure function — no need to boot the API server.
 * Run after `node build.mjs` so `dist/` exists.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildOpenApiDocument } from '../../api/src/openapi.js';

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:3001').replace(
  /\/$/,
  '',
);

const docsRoot = resolve('dist');
await mkdir(docsRoot, { recursive: true });

const document = buildOpenApiDocument({ serverUrl: apiUrl });
const outPath = resolve(docsRoot, 'openapi.json');
await writeFile(outPath, JSON.stringify(document, null, 2), 'utf8');
console.log(`OpenAPI snapshot written to ${outPath}`);
