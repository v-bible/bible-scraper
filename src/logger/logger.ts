import { createLogger, format, transports } from 'winston';
import 'dotenv/config';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.splat(), format.json()),
  transports: [
    new transports.Console(),
    new transports.File({
      filename: process.env.LOG_FILE_PATH || 'scraper.log',
    }),
  ],
});

export { logger };
