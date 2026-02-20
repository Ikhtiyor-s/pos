// Integration Core — BullMQ Queue

import { Queue } from 'bullmq';
import { redisConnection } from './connection.js';
import type { EventPayload } from '../core/types.js';

export const integrationQueue = new Queue('integration-events', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export async function addToQueue(payload: EventPayload): Promise<void> {
  await integrationQueue.add('dispatch', payload, {
    priority: payload.event === 'order:new' ? 1 : 5,
  });
}
