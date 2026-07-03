import 'dotenv/config';

export type NodeEnv = 'development' | 'production' | 'test';

export interface AppConfig {
  NODE_ENV: NodeEnv;
  PORT: number;
  HOST: string;
  DATABASE_PATH: string;
  LOG_LEVEL: string;
  CORS_ORIGIN: string;
}

function intFromEnv(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid integer env value: "${value}"`);
  }
  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const NODE_ENV = (env.NODE_ENV as NodeEnv | undefined) ?? 'development';
  return {
    NODE_ENV,
    PORT: intFromEnv(env.PORT, 3000),
    HOST: env.HOST?.trim() || '0.0.0.0',
    DATABASE_PATH: env.DATABASE_PATH?.trim() || './data/youscan.sqlite',
    LOG_LEVEL: env.LOG_LEVEL?.trim() || 'info',
    CORS_ORIGIN: env.CORS_ORIGIN?.trim() || '*',
  };
}

export const config = loadConfig();
