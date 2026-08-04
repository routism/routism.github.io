import 'dotenv/config';
import { runMigrations, closeDatabase } from './database.js';
import { logger } from '../utils/logger.js';

try {
  runMigrations();
  logger.info('Migration complete');
} catch (err) {
  logger.error('Migration failed', { message: err.message });
  process.exitCode = 1;
} finally {
  closeDatabase();
}
