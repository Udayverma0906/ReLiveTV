import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import healthRouter from './routes/health.js';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: env.frontendUrl,
    credentials: true,
  }));

  app.use(express.json());

  app.use('/health', healthRouter);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}