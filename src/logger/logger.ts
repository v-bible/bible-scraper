import { createLogger, format, transports } from 'winston';
import 'dotenv/config';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.splat(), format.json()),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'scraping.log' }),
  ],
});

export { logger };
