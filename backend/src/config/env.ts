import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

if (!process.env.DATABASE_URL && isProd) {
  throw new Error('FATAL: DATABASE_URL environment variable is required in production.');
}

if (!process.env.JWT_SECRET && isProd) {
  throw new Error('FATAL: JWT_SECRET environment variable is required in production.');
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
