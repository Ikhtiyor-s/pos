// ==========================================
// ENV VALIDATION
// Server ishga tushganda barcha muhim env var larni tekshiradi
// Agar majburiy o'zgaruvchi yo'q bo'lsa — xato bilan to'xtaydi
// ==========================================

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  REDIS_URL: string;
  CLIENT_URL: string[];
}

const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

const optional = {
  NODE_ENV: 'development',
  PORT: '3000',
  REDIS_URL: 'redis://localhost:6379',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
} as const;

export function validateEnv(): EnvConfig {
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('\n╔══════════════════════════════════════════════╗');
    console.error('║  XATO: Majburiy environment variables yo\'q   ║');
    console.error('╠══════════════════════════════════════════════╣');
    missing.forEach((key) => {
      console.error(`║  ❌ ${key.padEnd(40)} ║`);
    });
    console.error('╚══════════════════════════════════════════════╝\n');
    process.exit(1);
  }

  // Set defaults for optional vars
  for (const [key, defaultValue] of Object.entries(optional)) {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
    }
  }

  const clientUrl = process.env.CLIENT_URL?.split(',') || [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'http://localhost:5180',
  ];

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    CLIENT_URL: clientUrl,
  };
}
