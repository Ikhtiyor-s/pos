// Integration Core — BullMQ Worker

import { Worker } from 'bullmq';
import { redisConnection } from './connection.js';
import { dispatch } from '../core/dispatcher.js';

let worker: Worker | null = null;

export function startWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(
    'integration-events',
    async (job) => {
      await dispatch(job.data);
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Integration] ✓ ${job.data.event} (${job.id})`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Integration] ✗ ${job?.data?.event}: ${err.message}`);
  });

  console.log('[Integration] Worker boshlandi');
  return worker;
}

export function getWorker(): Worker | null {
  return worker;
}
