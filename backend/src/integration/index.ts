// Integration Core — Markaziy eksport va initializatsiya

export { emitEvent } from './core/event-bus.js';
export { dispatch } from './core/dispatcher.js';
export { startWorker, getWorker } from './queue/worker.js';
export { integrationQueue, addToQueue } from './queue/queue.js';
export type { IntegrationEvent, EventPayload, AdapterResult } from './core/types.js';
