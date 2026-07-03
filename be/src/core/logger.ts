import { pino, type Logger, type LoggerOptions } from 'pino';
import { config, type AppConfig } from '../config/config';

export function buildLoggerOptions(cfg: AppConfig): LoggerOptions {
  // Keep tests quiet; pretty-print in dev; structured JSON in prod.
  if (cfg.NODE_ENV === 'test') return { level: 'silent' };

  const options: LoggerOptions = {
    level: cfg.LOG_LEVEL,
    // Never leak credentials into logs.
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'headers.authorization', 'headers.cookie'],
      remove: true,
    },
  };

  if (cfg.NODE_ENV === 'development') {
    options.transport = {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    };
  }

  return options;
}

export const logger: Logger = pino(buildLoggerOptions(config));
