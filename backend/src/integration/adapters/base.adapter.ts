// Integration Core — Base Adapter interfeysi
// Barcha adapterlar shu sinfdan meros oladi

import type { EventPayload } from '../core/types.js';

export abstract class BaseAdapter {
  /** Adapter identifikatori (log uchun) */
  abstract key: string;

  /** Bu adapter shu eventni qayta ishlashi kerakmi? */
  abstract shouldHandle(event: string, settings: any): boolean;

  /** Eventni tashqi servisga yuborish */
  abstract execute(payload: EventPayload, settings: any): Promise<void>;
}
