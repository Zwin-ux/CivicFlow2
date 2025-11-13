import winston from 'winston';
import config from '../config';

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'lending-crm' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Add console transport in development
// Always log errors to console so container/platform logs capture failures.
// Keep the pretty console format in non-production, and a JSON/simple format in production.
logger.add(
  new winston.transports.Console({
    level: config.env === 'production' ? 'info' : 'debug',
    format: config.env === 'production'
      ? winston.format.combine(winston.format.timestamp(), winston.format.json())
      : winston.format.combine(winston.format.colorize(), winston.format.simple()),
  })
);

export default logger;
