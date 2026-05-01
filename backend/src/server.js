import http from 'http';
import pino from 'pino';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { createSocketServer } from './socket.js';

const logger = pino({
  transport: env.isDev
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

const app = createApp();
const httpServer = http.createServer(app);
const io = createSocketServer(httpServer);

httpServer.listen(env.port, () => {
  logger.info(`🎬 ReLiveTV backend running on http://localhost:${env.port}`);
  logger.info(`🔌 Socket.IO ready, accepting connections`);
  logger.info(`🌐 CORS allowed origin: ${env.frontendUrl}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...');
  httpServer.close(() => process.exit(0));
});