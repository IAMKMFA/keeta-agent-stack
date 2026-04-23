import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { KeetaAnchor, KeetaNet } from './helpers.js';
import { getProperty, isConstructable, listMethods, listProperties, safeSerialize, validateNetwork, createUserClient, accountFromSeed } from './helpers.js';

/**
 * MCP tools that expose `@keetanetwork/anchor` chaining capabilities (0.0.58+):
 *   - `keeta_anchor_chaining_graph_nodes`: compute all graph nodes (providers/routes)
 *   - `keeta_anchor_chaining_find_paths`: enumerate candidate paths between two assets/locations
 *   - `keeta_anchor_chaining_resolve_assets`: resolve reachable source/target assets with distance + rails
 *   - `keeta_anchor_chaining_list_assets`: list candidate assets for one side of a chain
 *
 * These tools are read-only discovery wrappers. They do not sign or execute anything.
 */

function render(payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(safeSerialize(payload), null, 2),
      },
    ],
  };
}

function getAnchorChainingClass(): new (config: unknown) => unknown {
  const AnchorChaining = getProperty(KeetaAnchor, 'AnchorChaining') ?? getProperty(KeetaAnchor, 'Chaining');
  if (!isConstructable(AnchorChaining)) {
    throw new Error(
      'AnchorChaining is not exported by @keetanetwork/anchor at this version. ' +
        'Upgrade to 0.0.58 or newer, or inspect exports via the keeta_describe_anchor tool.'
    );
  }
  return AnchorChaining as new (config: unknown) => unknown;
}

type AnchorChainingInstance = {
  graph: { computeGraphNodes: () => Promise<unknown>; findPaths: (input: unknown) => Promise<unknown>; resolveAssets: (filter?: unknown) => Promise<unknown>; listAssets: (filter?: unknown) => Promise<unknown> };
};

function resolveSeed(inlineSeed: string | undefined): string | undefined {
  if (inlineSeed !== undefined) {
    const allow = process.env.MCP_ALLOW_INLINE_SEEDS === 'true' || process.env.MCP_ALLOW_INLINE_SEEDS === '1';
    if (!allow) {
      throw new Error(
        'Inline seeds are disabled in this MCP deployment. Remove the `seed` argument or set MCP_ALLOW_INLINE_SEEDS=true (dev only).'
      );
    }
    return inlineSeed;
  }
  return process.env.KEETA_SIGNING_SEED;
}

async function withAnchorChaining<T>(
  network: string,
  seed: string | undefined,
  account_index: number,
  fn: (chaining: AnchorChainingInstance, userClient: unknown) => Promise<T>
): Promise<T> {
  const net = validateNetwork(network);
  const resolvedSeed = resolveSeed(seed);
  const account = resolvedSeed ? accountFromSeed(resolvedSeed, account_index) : null;
  const userClient = createUserClient(net, account);
  try {
    const AnchorChaining = getAnchorChainingClass();
    const instance = new AnchorChaining({ client: userClient }) as { graph?: unknown };
    const graph = (instance.graph ?? instance) as AnchorChainingInstance['graph'];
    if (
      typeof graph.computeGraphNodes !== 'function' ||
      typeof graph.findPaths !== 'function' ||
      typeof graph.resolveAssets !== 'function' ||
      typeof graph.listAssets !== 'function'
    ) {
      throw new Error('AnchorChaining instance does not expose the expected graph surface.');
    }
    return await fn({ graph }, userClient);
  } finally {
    const destroy = (userClient as { destroy?: () => Promise<void> | void }).destroy;
    if (typeof destroy === 'function') {
      try {
        await destroy.call(userClient);
      } catch {
        /* ignore destroy errors */
      }
    }
  }
}

const sideFilterSchema = z.object({
  location: z.string().min(1).optional(),
  asset: z.string().min(1).optional(),
  rail: z.string().min(1).optional(),
});

export function registerAnchorChainingTools(server: McpServer): void {
  server.tool(
    'keeta_describe_anchor',
    'Describe the shape of the @keetanetwork/anchor module, including available services, lib modules, and AnchorChaining support.',
    {},
    async () => {
      try {
        const AnchorChaining = getProperty(KeetaAnchor, 'AnchorChaining') ?? getProperty(KeetaAnchor, 'Chaining');
        return render({
          version: (getProperty(KeetaAnchor, 'VERSION') ?? 'unknown') as unknown,
          anchorTopLevelKeys: Object.keys(KeetaAnchor as Record<string, unknown>),
          libKeys: Object.keys((KeetaAnchor.lib ?? {}) as Record<string, unknown>),
          anchorChainingAvailable: typeof AnchorChaining === 'function',
          keetaNetTopLevelKeys: Object.keys(KeetaNet as Record<string, unknown>).slice(0, 50),
        });
      } catch (error) {
        return render({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  server.tool(
    'keeta_anchor_chaining_resolve_assets',
    "Resolve reachable source/target assets in the Keeta anchor-chaining graph, with rail inbound/outbound lists and pathLength distance (anchor 0.0.58's resolveAssets).",
    {
      network: z.enum(['main', 'test']).describe('Keeta network to query.'),
      from: sideFilterSchema.optional(),
      to: sideFilterSchema.optional(),
      max_step_count: z.number().int().min(1).max(10).optional(),
      only_allow_fx_like: z.boolean().optional(),
      seed: z.string().optional().describe('Optional seed; if omitted, uses a read-only UserClient.'),
      account_index: z.number().int().nonnegative().default(0),
    },
    async ({ network, from, to, max_step_count, only_allow_fx_like, seed, account_index }) => {
      try {
        const result = await withAnchorChaining(network, seed, account_index, async ({ graph }) => {
          const filter: Record<string, unknown> = {};
          if (from) filter.from = from;
          if (to) filter.to = to;
          if (typeof max_step_count === 'number') filter.maxStepCount = max_step_count;
          if (typeof only_allow_fx_like === 'boolean') filter.onlyAllowFXLike = only_allow_fx_like;
          return await graph.resolveAssets(Object.keys(filter).length === 0 ? undefined : filter);
        });
        return render(result);
      } catch (error) {
        return render({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  server.tool(
    'keeta_anchor_chaining_list_assets',
    'List assets reachable from or to a side of the Keeta anchor-chaining graph (anchor 0.0.58 listAssets).',
    {
      network: z.enum(['main', 'test']),
      side: z.enum(['from', 'to']).default('from'),
      location: z.string().optional(),
      asset: z.string().optional(),
      rail: z.string().optional(),
      max_step_count: z.number().int().min(1).max(10).optional(),
      only_allow_fx_like: z.boolean().optional(),
      seed: z.string().optional(),
      account_index: z.number().int().nonnegative().default(0),
    },
    async ({ network, side, location, asset, rail, max_step_count, only_allow_fx_like, seed, account_index }) => {
      try {
        const result = await withAnchorChaining(network, seed, account_index, async ({ graph }) => {
          const sideFilter: Record<string, unknown> = {};
          if (location) sideFilter.location = location;
          if (asset) sideFilter.asset = asset;
          if (rail) sideFilter.rail = rail;
          const filter: Record<string, unknown> = { [side]: sideFilter };
          if (typeof max_step_count === 'number') filter.maxStepCount = max_step_count;
          if (typeof only_allow_fx_like === 'boolean') filter.onlyAllowFXLike = only_allow_fx_like;
          return await graph.listAssets(filter);
        });
        return render(result);
      } catch (error) {
        return render({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  server.tool(
    'keeta_anchor_chaining_graph_nodes',
    'Compute all graph nodes (provider edges) in the Keeta anchor-chaining graph.',
    {
      network: z.enum(['main', 'test']),
      seed: z.string().optional(),
      account_index: z.number().int().nonnegative().default(0),
    },
    async ({ network, seed, account_index }) => {
      try {
        const result = await withAnchorChaining(network, seed, account_index, async ({ graph }) =>
          graph.computeGraphNodes()
        );
        return render(result);
      } catch (error) {
        return render({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  server.tool(
    'keeta_anchor_chaining_find_paths',
    'Find candidate paths between a source and destination asset/location in the anchor-chaining graph.',
    {
      network: z.enum(['main', 'test']),
      source: z.object({
        asset: z.string().min(1),
        location: z.string().min(1),
        rail: z.string().min(1),
        value: z.string().optional().describe('Optional decimal bigint string.'),
      }),
      destination: z.object({
        asset: z.string().min(1),
        location: z.string().min(1),
        rail: z.string().min(1),
        value: z.string().optional(),
        recipient: z.record(z.unknown()).describe('RecipientResolved payload as per anchor SDK.'),
      }),
      seed: z.string().optional(),
      account_index: z.number().int().nonnegative().default(0),
    },
    async ({ network, source, destination, seed, account_index }) => {
      try {
        const result = await withAnchorChaining(network, seed, account_index, async ({ graph }) => {
          const toBigint = (v: string | undefined) => (typeof v === 'string' ? BigInt(v) : undefined);
          return await graph.findPaths({
            source: {
              asset: source.asset,
              location: source.location,
              rail: source.rail,
              value: toBigint(source.value),
            },
            destination: {
              asset: destination.asset,
              location: destination.location,
              rail: destination.rail,
              value: toBigint(destination.value),
              recipient: destination.recipient,
            },
          });
        });
        return render(result);
      } catch (error) {
        return render({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  server.tool(
    'keeta_anchor_chaining_introspect',
    'Introspect the methods and properties of an AnchorChaining instance (for debugging upstream API drift).',
    {
      network: z.enum(['main', 'test']),
    },
    async ({ network }) => {
      try {
        const info = await withAnchorChaining(network, undefined, 0, async ({ graph }) => ({
          graphMethods: listMethods(graph),
          graphProperties: listProperties(graph),
        }));
        return render(info);
      } catch (error) {
        return render({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );
}
