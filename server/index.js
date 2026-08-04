import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

import { runMigrations } from './db/database.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { startScheduler } from './scheduler.js';
import { logger } from './utils/logger.js';

import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/task.routes.js';
import insightsRoutes from './routes/insights.routes.js';
import premiumRoutes from './routes/premium.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import achievementRoutes from './routes/achievement.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import healthRoutes from './routes/health.routes.js';

if (!process.env.JWT_SECRET) {
  logger.error('JWT_SECRET is not set. Refusing to start — set it in your .env file.');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

runMigrations();

const app = express();

app.use(helmet({
  contentSecurityPolicy: false, // the PWA is same-origin static + fetch; CSP can be tightened per-deployment
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/health', healthRoutes);

app.use(express.static(PUBLIC_DIR, { maxAge: '1h' }));

// SPA fallback: any non-API GET request serves the app shell so the client router can take over.
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use('/api', notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Routism server listening on port ${PORT}`);
  startScheduler();
});
