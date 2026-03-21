import winston from 'winston';

const { combine, timestamp, colorize, printf, json, errors } = winston.format;

const isDev = process.env['NODE_ENV'] !== 'production';

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, service, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${ts} [${service}] ${level}: ${message}${metaStr}${stackStr}`;
  }),
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

// Winston levels (lowest number = highest priority):
// error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
const logger = winston.createLogger({
  levels: winston.config.npm.levels,
  level: process.env['LOG_LEVEL'] ?? (isDev ? 'debug' : 'http'),
  defaultMeta: { service: 'api-gateway' },
  format: isDev ? devFormat : prodFormat,
  transports: [
    new winston.transports.Console(),
  ],
});

export default logger;
