import winston from 'winston';
import { config } from './config.js';

export const logger = winston.createLogger({
  level: config.environment === 'development' ? 'debug' : 'info',
  format:
    config.environment === 'development'
      ? winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} [${level}] ${message}${metaStr}`;
          }),
        )
      : winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});
