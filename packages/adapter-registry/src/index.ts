export { AdapterRegistry } from './registry.js';
export { createDefaultDevAdapters, createDefaultDevRegistry } from './factory.js';
export {
  getBuiltinRailMetadata,
  listBuiltinRailMetadata,
  listBuiltinRailMetadataDetailed,
  listBuiltinRailsByTransport,
  mergeRailMetadata,
  type RailMetadataEntry,
  type RailTransport,
} from './metadata.js';
