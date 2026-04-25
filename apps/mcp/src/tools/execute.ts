import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  accountFromPublicKey,
  accountFromSeed,
  createAnchorServiceClient,
  createClient,
  createUserClient,
  destroyIfPossible,
  discoverAnchorLibModules,
  discoverAnchorServices,
  formatResult,
  getMethod,
  getProperty,
  getRequiredMethod,
  getUserClientTools,
  getAnchorLibModule,
  isConstructable,
  isGetterLike,
  KeetaAnchor,
  resolveArg,
  resolveArgs,
  validateNetwork,
} from './helpers.js';

/**
 * MCP security gate for inline seeds. When `MCP_ALLOW_INLINE_SEEDS` is not truthy, the worker
 * rejects requests that include a `seed` argument and instead falls back to the server-held
 * `KEETA_SIGNING_SEED` if present.
 *
 * Motivation: inline seed arguments flow through the MCP transcript, server logs, and client
 * tool invocations — giving them far more exposure than a worker-pinned environment variable.
 */
export function inlineSeedsAllowed(): boolean {
  const v = process.env.MCP_ALLOW_INLINE_SEEDS;
  return v === 'true' || v === '1';
}

/**
 * Resolve the seed to use for a MCP execution.
 *   - If the caller passed an inline seed AND `MCP_ALLOW_INLINE_SEEDS` is set, honor it.
 *   - If the caller passed an inline seed but inline seeds are disabled, throw a clear error.
 *   - If the caller passed no seed, fall back to the worker's `KEETA_SIGNING_SEED` (if set).
 *   - Otherwise return `undefined` so callers can choose a read-only path.
 */
export function resolveSeedOrThrow(inlineSeed: string | undefined): string | undefined {
  if (inlineSeed !== undefined) {
    if (!inlineSeedsAllowed()) {
      throw new Error(
        'Inline seeds are disabled in this MCP deployment. Remove the `seed` argument or set MCP_ALLOW_INLINE_SEEDS=true (dev only).'
      );
    }
    return inlineSeed;
  }
  return process.env.KEETA_SIGNING_SEED;
}

export function registerExecuteTools(server: McpServer): void {
  server.tool(
    'keeta_client_execute',
    'Execute any read-only method on Keeta Client.',
    {
      network: z.enum(['main', 'test']),
      method: z.string(),
      args: z.array(z.unknown()).default([]),
    },
    async ({ network, method, args }) => {
      const client = createClient(validateNetwork(network));
      const fn = getRequiredMethod(client, method, 'Client');
      const result = await fn.apply(client, resolveArgs(args));
      return { content: [{ type: 'text', text: formatResult(result) }] };
    }
  );

  server.tool(
    'keeta_user_client_execute',
    'Execute a method on UserClient (authenticated or read-only with no seed).',
    {
      network: z.enum(['main', 'test']),
      seed: z.string().optional(),
      accountIndex: z.number().int().min(0).default(0),
      method: z.string(),
      args: z.array(z.unknown()).default([]),
    },
    async ({ network, seed, accountIndex, method, args }) => {
      const resolvedSeed = resolveSeedOrThrow(seed);
      const account = resolvedSeed ? accountFromSeed(resolvedSeed, accountIndex) : null;
      const client = createUserClient(validateNetwork(network), account);
      try {
        if (method === 'GET_PROPERTY') {
          const propertyName = String(args[0] ?? '');
          const value = getProperty(client, propertyName);
          const resolved = isGetterLike(value) ? value.get() : value;
          return { content: [{ type: 'text', text: formatResult(resolved) }] };
        }
        const fn = getRequiredMethod(client, method, 'UserClient');
        const result = await fn.apply(client, resolveArgs(args));
        return { content: [{ type: 'text', text: formatResult(result) }] };
      } finally {
        await destroyIfPossible(client);
      }
    }
  );

  server.tool(
    'keeta_builder_execute',
    'Execute a sequence of Builder operations and optionally publish blocks. Requires a signing seed: pass `seed` only when MCP_ALLOW_INLINE_SEEDS=true, otherwise the worker uses the server-pinned KEETA_SIGNING_SEED.',
    {
      network: z.enum(['main', 'test']),
      seed: z.string().optional(),
      accountIndex: z.number().int().min(0).default(0),
      operations: z.array(
        z.object({
          method: z.string(),
          args: z.array(z.unknown()).default([]),
          options: z.record(z.unknown()).optional(),
          computeAfter: z.boolean().default(false),
        })
      ),
      autoPublish: z.boolean().default(true),
    },
    async ({ network, seed, accountIndex, operations, autoPublish }) => {
      const resolvedSeed = resolveSeedOrThrow(seed);
      if (!resolvedSeed) {
        throw new Error(
          'keeta_builder_execute requires a signing seed. Set KEETA_SIGNING_SEED on the MCP host, or enable MCP_ALLOW_INLINE_SEEDS=true (dev only) and pass `seed`.'
        );
      }
      const account = accountFromSeed(resolvedSeed, accountIndex);
      const client = createUserClient(validateNetwork(network), account);
      try {
        const builder = getUserClientTools(client).initBuilder();

        for (const op of operations) {
          const fn = getRequiredMethod(builder, op.method, 'Builder');
          const resolvedArgs = resolveArgs(op.args);
          if (op.options) resolvedArgs.push(resolveArg(op.options));
          await fn.apply(builder, resolvedArgs);
          if (op.computeAfter) {
            await getRequiredMethod(builder, 'computeBlocks', 'Builder').call(builder);
          }
        }

        if (autoPublish) {
          await getRequiredMethod(builder, 'computeBlocks', 'Builder').call(builder);
          await getRequiredMethod(builder, 'publish', 'Builder').call(builder);
        }

        const blockValues = Array.isArray(getProperty(builder, 'blocks'))
          ? getProperty(builder, 'blocks')
          : [];
        const blocks = (Array.isArray(blockValues) ? blockValues : []).map((block) => {
          const hash = getProperty(block, 'hash');
          const toString = getMethod(hash, 'toString');
          return toString ? String(toString.call(hash)) : String(hash);
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  account: account.publicKeyString.get(),
                  operationCount: operations.length,
                  blocksPublished: blocks.length,
                  blockHashes: blocks,
                  status: autoPublish ? 'published' : 'built_not_published',
                },
                null,
                2
              ),
            },
          ],
        };
      } finally {
        await destroyIfPossible(client);
      }
    }
  );

  server.tool(
    'keeta_anchor_execute',
    'Execute anchor operations dynamically against service clients or lib modules.',
    {
      network: z.enum(['main', 'test']),
      seed: z.string().optional(),
      accountIndex: z.number().int().min(0).default(0),
      subtarget: z.enum(['service', 'lib', 'metadata']),
      serviceName: z.string().optional(),
      libModule: z.string().optional(),
      method: z.string(),
      args: z.array(z.unknown()).default([]),
      rootAddress: z.string().optional(),
    },
    async ({
      network,
      seed,
      accountIndex,
      subtarget,
      serviceName,
      libModule,
      method,
      args,
      rootAddress,
    }) => {
      const resolvedSeed = resolveSeedOrThrow(seed);
      const account = resolvedSeed ? accountFromSeed(resolvedSeed, accountIndex) : null;
      const client = createUserClient(validateNetwork(network), account);
      try {
        const root = rootAddress
          ? accountFromPublicKey(rootAddress)
          : getUserClientTools(client).networkAddress;
        const resolvedArgs = resolveArgs(args);
        let result: unknown;

        if (subtarget === 'service') {
          if (!serviceName) {
            throw new Error(
              `serviceName is required. Available: ${Object.keys(discoverAnchorServices()).join(', ')}`
            );
          }
          const serviceClient = createAnchorServiceClient(serviceName, client, { root });
          const fn = getRequiredMethod(serviceClient, method, `AnchorService:${serviceName}`);
          result = await fn.apply(serviceClient, resolvedArgs);
          return { content: [{ type: 'text', text: formatResult(result) }] };
        }

        if (subtarget === 'lib') {
          if (!libModule) {
            throw new Error(
              `libModule is required. Available: ${Object.keys(discoverAnchorLibModules()).join(', ')}`
            );
          }
          const moduleTarget = getAnchorLibModule(libModule);
          if (isConstructable(moduleTarget)) {
            const staticMethod = getMethod(moduleTarget, method);
            if (typeof staticMethod === 'function') {
              result = await staticMethod.apply(moduleTarget, resolvedArgs);
              return { content: [{ type: 'text', text: formatResult(result) }] };
            }
            const prototypeMethod = getMethod(moduleTarget.prototype, method);
            if (prototypeMethod) {
              const instance = new moduleTarget(resolvedArgs[0]);
              result = await prototypeMethod.apply(instance, resolvedArgs.slice(1));
              return { content: [{ type: 'text', text: formatResult(result) }] };
            }
            throw new Error(`"${method}" is not available on AnchorLib:${libModule}.`);
          }

          if (typeof moduleTarget === 'object' && moduleTarget !== null) {
            const fn = getMethod(moduleTarget, method);
            if (typeof fn === 'function') {
              result = await fn.apply(moduleTarget, resolvedArgs);
              return { content: [{ type: 'text', text: formatResult(result) }] };
            }

            for (const value of Object.values(moduleTarget as Record<string, unknown>)) {
              if (isConstructable(value) && getMethod(value.prototype, method)) {
                const instance = new value(resolvedArgs[0]);
                const instanceMethod = getRequiredMethod(
                  instance,
                  method,
                  `AnchorLib:${libModule}`
                );
                result = await instanceMethod.apply(instance, resolvedArgs.slice(1));
                return { content: [{ type: 'text', text: formatResult(result) }] };
              }
            }
          }

          throw new Error(`"${method}" is not available on AnchorLib:${libModule}.`);
        }

        const metadataFn = getRequiredMethod(
          KeetaAnchor.lib.Resolver.Metadata,
          method,
          'Resolver.Metadata'
        );
        result = await metadataFn.apply(KeetaAnchor.lib.Resolver.Metadata, resolvedArgs);
        return { content: [{ type: 'text', text: formatResult(result) }] };
      } finally {
        await destroyIfPossible(client);
      }
    }
  );
}
