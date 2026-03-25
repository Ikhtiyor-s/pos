// Integration Core — Event va Adapter turlari

export type IntegrationEvent =
  | 'order:new'
  | 'order:status'
  | 'order:completed'
  | 'order:cancelled'
  | 'payment:completed'
  | 'inventory:low'
  | 'product:created'
  | 'product:updated'
  | 'product:deleted';

export interface EventPayload {
  event: IntegrationEvent;
  data: any;
  timestamp: string;
}

export interface AdapterResult {
  success: boolean;
  error?: string;
  duration: number;
}
