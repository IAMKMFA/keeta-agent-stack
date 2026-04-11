import type { Queue } from 'bullmq';
import { createLogger } from './logger.js';

const log = createLogger('telemetry');

export interface TelemetryEventInput {
  name: string;
  payload: Record<string, unknown>;
}

export class TelemetryEmitter {
  private buffer: TelemetryEventInput[] = [];

  constructor(private readonly queue?: Queue) {}

  emit(event: TelemetryEventInput): void {
    this.buffer.push(event);
    log.debug({ event: event.name }, 'telemetry buffered');
  }

  /** Drain buffer — worker calls this and persists to DB */
  async flush(): Promise<TelemetryEventInput[]> {
    const batch = this.buffer;
    this.buffer = [];
    if (this.queue) {
      await this.queue.add('flush', { batch }, { removeOnComplete: true });
    }
    return batch;
  }

  peek(): TelemetryEventInput[] {
    return [...this.buffer];
  }
}
