import { z } from 'zod';

export const IntentCreatedPayloadSchema = z.object({
  intentId: z.string().uuid(),
});

export type IntentCreatedPayload = z.infer<typeof IntentCreatedPayloadSchema>;
