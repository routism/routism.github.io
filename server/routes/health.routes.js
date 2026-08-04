import { Router } from 'express';
import { db } from '../db/database.js';

const router = Router();

router.get('/', (req, res) => {
  let dbOk = true;
  try {
    db.prepare('SELECT 1').get();
  } catch {
    dbOk = false;
  }
  res.json({
    status: dbOk ? 'ok' : 'degraded',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: dbOk ? 'connected' : 'unavailable',
  });
});

export default router;
