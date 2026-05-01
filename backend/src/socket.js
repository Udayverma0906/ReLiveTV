import { Server } from 'socket.io';
import { env } from './config/env.js';

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.frontendUrl,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected: ${socket.id} (${reason})`);
    });

    // Step 1.D placeholder — real handlers come in Step 4
    socket.on('ping', () => {
      socket.emit('pong', { time: Date.now() });
    });
  });

  return io;
}