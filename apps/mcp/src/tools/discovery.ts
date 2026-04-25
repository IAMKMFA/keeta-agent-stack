import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  createClient,
  createUserClient,
  destroyIfPossible,
  discoverAnchorLibModules,
  discoverAnchorServices,
  getOwnMethodNames,
  getPrototypeMethodNames,
  getUserClientTools,
  isConstructable,
  KeetaNet,
  listMethods,
  listProperties,
  validateNetwork,
} from './helpers.js';

export function registerDiscoveryTools(server: McpServer): void {
  server.tool(
    'keeta_list_sdk_methods',
    `Discover available methods/properties on Keeta SDK objects.
Targets: Client, UserClient, Builder, Account, Block, Permissions, Config, AnchorCatalog, AnchorService:<Name>, AnchorLib:<Name>.`,
    {
      target: z.string(),
      network: z.enum(['main', 'test']).default('test'),
    },
    async ({ target, network }) => {
      const net = validateNetwork(network);
      let methods: string[] = [];
      let properties: string[] = [];
      let statics: string[] = [];
      let enums: Record<string, unknown> = {};
      let extra: Record<string, unknown> = {};

      switch (target) {
        case 'Client': {
          const client = createClient(net);
          methods = listMethods(client);
          properties = listProperties(client);
          break;
        }
        case 'UserClient': {
          const client = createUserClient(net, null);
          try {
            methods = listMethods(client);
            properties = listProperties(client);
          } finally {
            await destroyIfPossible(client);
          }
          break;
        }
        case 'Builder': {
          const client = createUserClient(net, null);
          try {
            const builderInstance = getUserClientTools(client).initBuilder();
            methods = listMethods(builderInstance);
            properties = listProperties(builderInstance);
          } finally {
            await destroyIfPossible(client);
          }
          break;
        }
        case 'Account': {
          statics = getOwnMethodNames(KeetaNet.lib.Account);
          enums = {
            AccountKeyAlgorithm: Object.fromEntries(
              Object.entries(KeetaNet.lib.Account.AccountKeyAlgorithm)
            ),
          };
          break;
        }
        case 'Block': {
          statics = Object.getOwnPropertyNames(KeetaNet.lib.Block).filter(
            (name) => !['prototype', 'name', 'length'].includes(name)
          );
          enums = {
            OperationType: Object.fromEntries(Object.entries(KeetaNet.lib.Block.OperationType)),
            AdjustMethod: Object.fromEntries(Object.entries(KeetaNet.lib.Block.AdjustMethod)),
          };
          break;
        }
        case 'Permissions': {
          statics = Object.getOwnPropertyNames(KeetaNet.lib.Permissions.prototype).filter(
            (name) => name !== 'constructor'
          );
          break;
        }
        case 'Config': {
          statics = getOwnMethodNames(KeetaNet.Client.Config);
          break;
        }
        case 'AnchorCatalog': {
          const services = discoverAnchorServices();
          const modules = discoverAnchorLibModules();

          const serviceDetails: Record<string, string[]> = {};
          for (const [name, ctor] of Object.entries(services)) {
            serviceDetails[name] = getPrototypeMethodNames(ctor).filter(
              (method) => !method.startsWith('_')
            );
          }

          const moduleDetails: Record<string, { type: string; members: string[] }> = {};
          for (const [name, mod] of Object.entries(modules)) {
            if (isConstructable(mod)) {
              const classMethods = getPrototypeMethodNames(mod);
              const staticMethods = getOwnMethodNames(mod).filter(
                (method) => !['prototype', 'name', 'length'].includes(method)
              );
              moduleDetails[name] = {
                type: 'class',
                members: [...staticMethods.map((method) => `static:${method}`), ...classMethods],
              };
              continue;
            }
            if (typeof mod === 'object' && mod !== null) {
              const members = Object.getOwnPropertyNames(mod).filter(
                (member) => !['default', '__esModule'].includes(member)
              );
              moduleDetails[name] = { type: 'namespace', members };
            }
          }

          extra = {
            services: serviceDetails,
            libModules: moduleDetails,
          };
          break;
        }
        default: {
          if (target.startsWith('AnchorService:')) {
            const name = target.slice('AnchorService:'.length);
            const services = discoverAnchorServices();
            const ctor = services[name];
            if (!ctor) throw new Error(`Unknown anchor service "${name}".`);
            statics = getPrototypeMethodNames(ctor);
            break;
          }

          if (target.startsWith('AnchorLib:')) {
            const name = target.slice('AnchorLib:'.length);
            const modules = discoverAnchorLibModules();
            const mod = modules[name];
            if (!mod) throw new Error(`Unknown anchor lib module "${name}".`);

            if (isConstructable(mod)) {
              methods = getPrototypeMethodNames(mod);
              statics = getOwnMethodNames(mod).filter(
                (method) => !['prototype', 'name', 'length'].includes(method)
              );
              break;
            }
            if (typeof mod === 'object' && mod !== null) {
              for (const [exportName, exportValue] of Object.entries(mod)) {
                if (['default', '__esModule'].includes(exportName)) continue;
                if (isConstructable(exportValue)) {
                  const prototypeMethodNames = getPrototypeMethodNames(exportValue);
                  if (prototypeMethodNames.length > 0) {
                    const classMethods = prototypeMethodNames.filter(
                      (method) => method !== 'constructor'
                    );
                    statics.push(`${exportName} [class: ${classMethods.join(', ')}]`);
                  } else {
                    statics.push(`${exportName} [function]`);
                  }
                  continue;
                }
                properties.push(`${exportName} [${typeof exportValue}]`);
              }
              break;
            }
          }

          throw new Error(
            `Unknown target "${target}". Use one of Client, UserClient, Builder, Account, Block, Permissions, Config, AnchorCatalog, AnchorService:<Name>, AnchorLib:<Name>.`
          );
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                target,
                ...(methods.length > 0 ? { methods } : {}),
                ...(properties.length > 0 ? { properties } : {}),
                ...(statics.length > 0 ? { statics } : {}),
                ...(Object.keys(enums).length > 0 ? { enums } : {}),
                ...(Object.keys(extra).length > 0 ? extra : {}),
                hint: 'Execute methods with keeta_client_execute, keeta_user_client_execute, keeta_builder_execute, or keeta_anchor_execute.',
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
