import { z } from 'zod';

/** Asset identifier (symbol, mint, or internal id). */
export const AssetIdSchema = z.string().min(1);

export const SideSchema = z.enum(['buy', 'sell']);

export const ExecutionModeSchema = z.enum(['simulate', 'live']);

export const VenueKindSchema = z.enum(['dex', 'anchor', 'transfer', 'agent-payment']);

export const SupportLevelSchema = z.enum([
  'listed',
  'readable',
  'routable',
  'simulatable',
  'executable',
  'agent-ready',
]);

export type ExecutionMode = z.infer<typeof ExecutionModeSchema>;
export type VenueKind = z.infer<typeof VenueKindSchema>;
export type SupportLevel = z.infer<typeof SupportLevelSchema>;
export type Side = z.infer<typeof SideSchema>;
