#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Starting local stack (Postgres + Redis)..."
docker compose up -d 2>/dev/null || docker-compose up -d
echo "Running migrations and seed..."
pnpm db:migrate
pnpm db:seed
echo "Starting dev servers (API + worker + dashboard)..."
pnpm dev
