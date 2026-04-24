interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  REDIS_URL: string;
  CLIENT_URL: string[];
}

const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;

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

  // Production xavfsizlik tekshiruvlari
  const isProduction = (process.env.NODE_ENV || 'development') === 'production';

  if (isProduction) {
    // JWT secret minimal uzunlik — 32 belgi
    if ((process.env.JWT_SECRET?.length ?? 0) < 32) {
      console.error('❌ JWT_SECRET kamida 32 belgi bo\'lishi kerak (production)');
      process.exit(1);
    }
    if ((process.env.JWT_REFRESH_SECRET?.length ?? 0) < 32) {
      console.error('❌ JWT_REFRESH_SECRET kamida 32 belgi bo\'lishi kerak (production)');
      process.exit(1);
    }
    // Production'da CLIENT_URL majburiy va localhost bo'lmasligi kerak
    if (!process.env.CLIENT_URL) {
      console.error('❌ CLIENT_URL production\'da majburiy');
      console.error('   Misol: CLIENT_URL=https://pos.example.uz,https://admin.example.uz');
      process.exit(1);
    }
    const prodUrls = process.env.CLIENT_URL.split(',').map((u) => u.trim());
    const hasLocalhost = prodUrls.some(
      (u) => u.includes('localhost') || u.includes('127.0.0.1') || u.startsWith('http://')
    );
    if (hasLocalhost) {
      console.error('❌ CLIENT_URL production\'da localhost yoki http:// ruxsat etilmaydi');
      console.error(`   Berilgan: ${prodUrls.join(', ')}`);
      console.error('   Faqat https:// va haqiqiy domen ishlatilishi kerak');
      process.exit(1);
    }
  }

  // Set defaults for optional vars
  for (const [key, defaultValue] of Object.entries(optional)) {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
    }
  }

  const clientUrl = process.env.CLIENT_URL?.split(',').map((u) => u.trim()) || [
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
