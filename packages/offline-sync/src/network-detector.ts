// ==========================================
// NETWORK DETECTOR
// Internet + LAN ulanish holatini kuzatadi
// Main server yoki local server ga ulanishni tekshiradi
// ==========================================

export type ConnectionMode = 'online' | 'local' | 'offline';

interface NetworkConfig {
  mainServerUrl: string;
  localServerUrl?: string;
  pingInterval: number;
  pingTimeout: number;
}

type StatusChangeCallback = (online: boolean, mode: ConnectionMode) => void;

export class NetworkDetector {
  private config: NetworkConfig;
  private _isOnline: boolean = navigator?.onLine ?? true;
  private _mode: ConnectionMode = 'online';
  private _mainServerReachable = false;
  private _localServerReachable = false;
  private listeners: StatusChangeCallback[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<NetworkConfig>) {
    this.config = {
      mainServerUrl: '',
      localServerUrl: '',
      pingInterval: 10000,
      pingTimeout: 3000,
      ...config,
    };

    // Browser events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.checkConnection());
      window.addEventListener('offline', () => this.setMode('offline'));
    }
  }

  // ==========================================
  // CONFIGURATION
  // ==========================================

  configure(config: Partial<NetworkConfig>): void {
    Object.assign(this.config, config);
  }

  // ==========================================
  // CONNECTION CHECK
  // ==========================================

  async checkConnection(): Promise<ConnectionMode> {
    // 1. Main server tekshirish
    if (this.config.mainServerUrl) {
      this._mainServerReachable = await this.ping(this.config.mainServerUrl);
      if (this._mainServerReachable) {
        this.setMode('online');
        return 'online';
      }
    }

    // 2. Local server tekshirish (LAN fallback)
    if (this.config.localServerUrl) {
      this._localServerReachable = await this.ping(this.config.localServerUrl);
      if (this._localServerReachable) {
        this.setMode('local');
        return 'local';
      }
    }

    // 3. Hech biri ishlamasa — offline
    this.setMode('offline');
    return 'offline';
  }

  private async ping(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.pingTimeout);

      const response = await fetch(`${url}/api/health`, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  // ==========================================
  // MODE MANAGEMENT
  // ==========================================

  private setMode(mode: ConnectionMode): void {
    const wasOnline = this._isOnline;
    const prevMode = this._mode;

    this._mode = mode;
    this._isOnline = mode !== 'offline';

    if (wasOnline !== this._isOnline || prevMode !== mode) {
      console.log(`[Network] Mode: ${prevMode} → ${mode}`);
      this.listeners.forEach(cb => cb(this._isOnline, mode));
    }
  }

  // ==========================================
  // PUBLIC API
  // ==========================================

  isOnline(): boolean {
    return this._isOnline;
  }

  getMode(): ConnectionMode {
    return this._mode;
  }

  isMainServerReachable(): boolean {
    return this._mainServerReachable;
  }

  isLocalServerReachable(): boolean {
    return this._localServerReachable;
  }

  // Hozirgi rejimga mos server URL
  getActiveServerUrl(): string {
    if (this._mode === 'online' && this.config.mainServerUrl) {
      return this.config.mainServerUrl;
    }
    if (this._mode === 'local' && this.config.localServerUrl) {
      return this.config.localServerUrl;
    }
    return ''; // offline — server yo'q
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================

  onStatusChange(callback: StatusChangeCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // ==========================================
  // PERIODIC CHECK
  // ==========================================

  startMonitoring(): void {
    if (this.intervalId) return;
    this.checkConnection();
    this.intervalId = setInterval(() => this.checkConnection(), this.config.pingInterval);
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const networkDetector = new NetworkDetector();
