import { z } from 'zod';

/** Asset identifier (symbol, mint, or internal id). */
export const AssetIdSchema = z.string().min(1);

export const SideSchema = z.enum(['buy', 'sell']);

export const ExecutionModeSchema = z.enum(['simulate', 'live']);

export const VenueKindSchema = z.enum(['dex', 'anchor', 'transfer']);

export type ExecutionMode = z.infer<typeof ExecutionModeSchema>;
export type VenueKind = z.infer<typeof VenueKindSchema>;
export type Side = z.infer<typeof SideSchema>;
