import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { scrapeRouter } from './routes/scrape.js';
import { healthRouter } from './routes/health.js';
import { notificationsRouter } from './routes/notifications.js';
import { analyticsRouter } from './routes/analytics.js';
import { postsRouter } from './routes/posts.js';
import { profileRouter } from './routes/profile.js';
import { actionsRouter } from './routes/actions.js';
import { startJobQueues } from './jobs/queue.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean);

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use('/health',        healthRouter);
app.use('/scrape',        scrapeRouter);
app.use('/notifications', notificationsRouter);
app.use('/analytics',     analyticsRouter);
app.use('/posts',         postsRouter);
app.use('/profile',       profileRouter);
app.use('/actions',       actionsRouter);

app.listen(PORT, () => {
  console.log(`ClassGrowth backend running on port ${PORT}`);
});

// Start queues after server is up (async, non-blocking)
startJobQueues();
