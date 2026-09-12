import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),

  databaseUrl: required('DATABASE_URL', 'mysql://user:password@localhost:3306/ruflo_resale'),

  jwtAccessSecret: required('JWT_ACCESS_SECRET', 'dev-only-insecure-secret'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtTemp2faSecret: required('JWT_TEMP_2FA_SECRET', 'dev-only-insecure-temp-secret'),
  jwtTemp2faExpiresIn: process.env.JWT_TEMP_2FA_EXPIRES_IN ?? '10m',

  twoFactorSetupGraceDays: Number(process.env.TWO_FACTOR_SETUP_GRACE_DAYS ?? 7),
  twoFactorIssuer: process.env.TWO_FACTOR_ISSUER ?? 'Ruflo Resale Inventory',

  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from: process.env.SMTP_FROM ?? 'Ruflo Resale Inventory <no-reply@ruflo.example.com>',
  },

  reminderCronSchedule: process.env.REMINDER_CRON_SCHEDULE ?? '0 9 * * *',

  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
};
