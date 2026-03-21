// ==========================================
// LOCAL SERVER DISCOVERY
// LAN dagi POS serverini topish
// Bitta qurilma server bo'ladi, boshqalari unga ulanadi
// ==========================================

interface DiscoveredServer {
  url: string;
  ip: string;
  port: number;
  latency: number;
  version?: string;
}

interface DiscoveryConfig {
  port: number;          // POS API port (default: 3000)
  subnet?: string;       // Tarmoq subnet (auto-detect yoki manual)
  timeout: number;       // Har bir IP uchun timeout (ms)
  knownIps?: string[];   // Oldindan ma'lum IP lar
}

export class ServerDiscovery {
  private config: DiscoveryConfig;
  private cachedServer: DiscoveredServer | null = null;

  constructor(config?: Partial<DiscoveryConfig>) {
    this.config = {
      port: 3000,
      timeout: 2000,
      ...config,
    };
  }

  // ==========================================
  // QUICK DISCOVERY — Oldin saqlangan yoki bilgan IP larni tekshirish
  // ==========================================

  async quickDiscover(): Promise<DiscoveredServer | null> {
    // 1. Cached server
    if (this.cachedServer) {
      const isAlive = await this.checkServer(this.cachedServer.ip);
      if (isAlive) return this.cachedServer;
      this.cachedServer = null;
    }

    // 2. LocalStorage dan oldingi muvaffaqiyatli IP
    const savedIp = typeof localStorage !== 'undefined'
      ? localStorage.getItem('pos-local-server-ip')
      : null;
    if (savedIp) {
      const server = await this.checkServer(savedIp);
      if (server) {
        this.cachedServer = server;
        return server;
      }
    }

    // 3. Ma'lum IP lar
    if (this.config.knownIps) {
      for (const ip of this.config.knownIps) {
        const server = await this.checkServer(ip);
        if (server) {
          this.cacheServer(server);
          return server;
        }
      }
    }

    // 4. Localhost
    const localhost = await this.checkServer('127.0.0.1');
    if (localhost) {
      this.cacheServer(localhost);
      return localhost;
    }

    return null;
  }

  // ==========================================
  // FULL SCAN — LAN dagi barcha qurilmalarni skanerlash
  // ==========================================

  async scanNetwork(
    onProgress?: (checked: number, total: number) => void,
  ): Promise<DiscoveredServer[]> {
    const servers: DiscoveredServer[] = [];

    // Common private network ranges
    const subnets = this.config.subnet
      ? [this.config.subnet]
      : ['192.168.1', '192.168.0', '10.0.0', '192.168.43']; // 43 = mobile hotspot

    const total = subnets.length * 254;
    let checked = 0;

    for (const subnet of subnets) {
      // Parallel scan — 20 ta bir vaqtda
      const batchSize = 20;
      for (let start = 1; start <= 254; start += batchSize) {
        const promises: Promise<DiscoveredServer | null>[] = [];

        for (let i = start; i < Math.min(start + batchSize, 255); i++) {
          const ip = `${subnet}.${i}`;
          promises.push(this.checkServer(ip));
        }

        const results = await Promise.all(promises);
        for (const result of results) {
          if (result) servers.push(result);
        }

        checked += promises.length;
        onProgress?.(checked, total);
      }

      // Bitta topilsa, shu subnetda davom etmaslik
      if (servers.length > 0) break;
    }

    // Eng tez javob berganini birinchi qilish
    servers.sort((a, b) => a.latency - b.latency);

    if (servers.length > 0) {
      this.cacheServer(servers[0]);
    }

    return servers;
  }

  // ==========================================
  // CHECK SINGLE SERVER
  // ==========================================

  private async checkServer(ip: string): Promise<DiscoveredServer | null> {
    const url = `http://${ip}:${this.config.port}`;
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${url}/api`, {
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - start;

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          url,
          ip,
          port: this.config.port,
          latency,
          version: data.version,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  // ==========================================
  // CACHE
  // ==========================================

  private cacheServer(server: DiscoveredServer): void {
    this.cachedServer = server;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pos-local-server-ip', server.ip);
    }
  }

  getCachedServer(): DiscoveredServer | null {
    return this.cachedServer;
  }

  clearCache(): void {
    this.cachedServer = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('pos-local-server-ip');
    }
  }
}

export const serverDiscovery = new ServerDiscovery();
