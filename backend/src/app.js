import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import healthRouter from './routes/health.js';
import meRouter from './routes/me.js';
import sessionsRouter from './routes/sessions.js';
import channelsRouter from './routes/channels.js';

export function createApp() {
  const app = express();
  
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman)
    if (!origin) return callback(null, true);
    if (env.frontendUrls.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

  app.use(express.json());

  app.use('/health', healthRouter);
  app.use('/me', meRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/channels', channelsRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}