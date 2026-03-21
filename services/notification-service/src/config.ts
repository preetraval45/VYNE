// ---------------------------------------------------------------------------
// Runtime configuration — reads from process.env with sane dev defaults
// ---------------------------------------------------------------------------

export const config = {
  port: parseInt(process.env['PORT'] ?? '5007', 10),
  environment: process.env['NODE_ENV'] ?? 'development',

  // Auth
  jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',

  // CORS
  corsOrigins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(','),

  // Redis (used by BullMQ and in-app notifications)
  redisUrl: process.env['REDIS_URL'] ?? 'redis://localhost:6379',

  // AWS
  awsRegion: process.env['AWS_REGION'] ?? 'us-east-1',
  sesFromAddress: process.env['SES_FROM_ADDRESS'] ?? 'noreply@vyne.app',

  // SQS
  sqsQueueUrl: process.env['SQS_QUEUE_URL'] ?? '',
  sqsQueueName: process.env['SQS_QUEUE_NAME'] ?? 'vyne-notifications.fifo',

  // BullMQ queue name
  bullQueueName: process.env['BULL_QUEUE_NAME'] ?? 'notifications',
} as const;

export const isDev = config.environment === 'development';
