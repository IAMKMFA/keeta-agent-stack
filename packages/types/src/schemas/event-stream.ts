import { z } from 'zod';

export const EventStreamSourceSchema = z.enum(['audit', 'anchor']);

export const EventStreamEventSchema = z.object({
  id: z.string().uuid(),
  source: EventStreamSourceSchema.default('audit'),
  eventType: z.string().min(1),
  intentId: z.string().uuid().optional(),
  paymentAnchorId: z.string().uuid().optional(),
  executionId: z.string().uuid().optional(),
  payload: z.record(z.unknown()),
  correlationId: z.string().optional(),
  createdAt: z.string().datetime(),
});

export const WebhookSubscriptionStatusSchema = z.enum(['active', 'paused']);

export const WebhookSubscriptionSchema = z.object({
  id: z.string().uuid(),
  targetUrl: z.string().url(),
  eventTypes: z.array(z.string().min(1)).default([]),
  status: WebhookSubscriptionStatusSchema,
  secretPresent: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const WebhookDeliveryStatusSchema = z.enum(['pending', 'delivered', 'failed']);

export const WebhookDeliverySchema = z.object({
  id: z.string().uuid(),
  subscriptionId: z.string().uuid(),
  eventSource: z.enum(['audit', 'anchor']).default('audit'),
  eventId: z.string().uuid(),
  // Kept for backward compatibility with older webhook consumers.
  auditEventId: z.string().uuid(),
  status: WebhookDeliveryStatusSchema,
  attemptCount: z.number().int().min(0),
  responseStatus: z.number().int().optional(),
  responseBody: z.string().optional(),
  lastError: z.string().optional(),
  deliveredAt: z.string().datetime().optional(),
  nextAttemptAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type EventStreamEvent = z.infer<typeof EventStreamEventSchema>;
export type EventStreamSource = z.infer<typeof EventStreamSourceSchema>;
export type WebhookSubscriptionStatus = z.infer<typeof WebhookSubscriptionStatusSchema>;
export type WebhookSubscription = z.infer<typeof WebhookSubscriptionSchema>;
export type WebhookDeliveryStatus = z.infer<typeof WebhookDeliveryStatusSchema>;
export type WebhookDelivery = z.infer<typeof WebhookDeliverySchema>;
