import type { FastifyPluginAsync } from 'fastify';
import {
  listBuiltinRailMetadataDetailed,
  listBuiltinRailsByTransport,
  type RailTransport,
} from '@keeta-agent-sdk/adapter-registry';
import { requireViewerAccess } from '../lib/auth.js';

const KNOWN_TRANSPORTS: RailTransport[] = ['fiat-push', 'fiat-pull', 'crypto', 'native'];

function parseTransports(raw: unknown): RailTransport[] | undefined {
  if (typeof raw !== 'string' || raw.trim().length === 0) return undefined;
  const values = raw
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter((v): v is RailTransport => KNOWN_TRANSPORTS.includes(v as RailTransport));
  return values.length > 0 ? values : undefined;
}

export const railsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/rails/catalog', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    const query = req.query as Record<string, unknown> | undefined;
    const transports = parseTransports(query?.transports);
    const productionOnly =
      typeof query?.productionOnly === 'string'
        ? query.productionOnly.toLowerCase() === 'true'
        : undefined;

    const rails =
      transports || productionOnly
        ? listBuiltinRailsByTransport({ transports, productionOnly })
        : listBuiltinRailMetadataDetailed();

    return { rails };
  });
};
