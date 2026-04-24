# syntax=docker/dockerfile:1.7

# Multi-stage build that produces a slim image for any of the apps in this
# monorepo. Override `APP` at build time:
#
#   docker build --build-arg APP=api    -t keeta-agent/api    .
#   docker build --build-arg APP=worker -t keeta-agent/worker .
#   docker build --build-arg APP=mcp    -t keeta-agent/mcp    .
#
# Each app's `pnpm build` outputs to `apps/<app>/dist/`. Workspace package
# dist directories are also packed into the runtime image so dynamic imports
# and adapter registry resolution keep working.

ARG NODE_VERSION=22
ARG PNPM_VERSION=9.15.4
ARG APP=api

# ---------- base ----------
FROM node:${NODE_VERSION}-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo

# ---------- deps (cached when nothing in lockfile changes) ----------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
COPY .changeset ./.changeset
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM deps AS build
ARG APP
RUN pnpm --filter @keeta-agent-stack/${APP}... build

# ---------- runtime ----------
FROM node:${NODE_VERSION}-alpine AS runtime
ARG APP
ENV NODE_ENV=production
RUN apk add --no-cache tini
WORKDIR /repo

# Copy whole workspace; pnpm symlinks via .pnpm need the full layout intact.
COPY --from=build /repo /repo

ENV APP=${APP}
EXPOSE 3001
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "pnpm --filter @keeta-agent-stack/$APP start"]
