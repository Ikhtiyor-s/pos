import winston from 'winston';
import 'winston-daily-rotate-file';
import * as Sentry from '@sentry/node';
import path from 'path';
import { EventEmitter } from 'events';

const LOGS_DIR = path.join(process.cwd(), 'logs');

const isProduction = process.env.NODE_ENV === 'production';
const isTest       = process.env.NODE_ENV === 'test';

// ============================================================
// SENTRY INIT (production only)
// ============================================================

if (isProduction && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: `oshxona-api@3.0.0`,
    tracesSampleRate: 0.05,
    integrations: [Sentry.httpIntegration()],
  });
}

// ============================================================
// SENTRY WINSTON TRANSPORT
// prom-client bilan birga @sentry/node createSentryWinstonTransport
// ============================================================

const sentryTransport = isProduction && process.env.SENTRY_DSN
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ? Sentry.createSentryWinstonTransport(winston as any, { level: 'warn' } as any) as unknown as winston.transport
  : null;

// ============================================================
// FORMATS
// ============================================================

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, requestId, ...meta }) => {
  const rid   = requestId ? ` [${requestId}]` : '';
  const extra = Object.keys(meta).filter(k => k !== 'service').length
    ? ` ${JSON.stringify(meta)}`
    : '';
  return `${ts}${rid} [${level}] ${message}${extra}`;
});

const productionFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  errors({ stack: true }),
  json(),
);

const developmentFormat = combine(
  timestamp({ format: 'HH:mm:ss.SSS' }),
  errors({ stack: true }),
  colorize({ all: true }),
  devFormat,
);

// ============================================================
// TRANSPORTS
// ============================================================

const transports: winston.transport[] = [
  new winston.transports.Console({
    silent: isTest,
    format: isProduction ? productionFormat : developmentFormat,
  }),
];

if (isProduction) {
  transports.push(
    new winston.transports.DailyRotateFile({
      dirname: LOGS_DIR,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true,
      format: productionFormat,
    }),
    new winston.transports.DailyRotateFile({
      dirname: LOGS_DIR,
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      maxFiles: '14d',
      zippedArchive: true,
      format: productionFormat,
    }),
  );

  if (sentryTransport) {
    transports.push(sentryTransport);
  }
}

// ============================================================
// LOGGER INSTANCE
// ============================================================

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  defaultMeta: { service: 'oshxona-api' },
  format: productionFormat,
  transports,
  exceptionHandlers: isProduction
    ? [new winston.transports.DailyRotateFile({
        dirname: LOGS_DIR,
        filename: 'exceptions-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxFiles: '14d',
        zippedArchive: true,
      })]
    : [],
  rejectionHandlers: isProduction
    ? [new winston.transports.DailyRotateFile({
        dirname: LOGS_DIR,
        filename: 'rejections-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxFiles: '14d',
        zippedArchive: true,
      })]
    : [],
  exitOnError: false,
});

export const childLogger = (meta: Record<string, unknown>) => logger.child(meta);

export async function flushLogger() {
  if (process.env.SENTRY_DSN) {
    await Sentry.flush(2000);
  }
}

export { Sentry };
