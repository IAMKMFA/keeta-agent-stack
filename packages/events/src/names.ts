export const DomainEvents = {
  IntentCreated: 'intent.created',
  QuoteReady: 'quote.ready',
  RouteReady: 'route.ready',
  PolicyEvaluated: 'policy.evaluated',
  ExecutionSubmitted: 'execution.submitted',
  SimulationCompleted: 'simulation.completed',
} as const;

export type DomainEventName = (typeof DomainEvents)[keyof typeof DomainEvents];
