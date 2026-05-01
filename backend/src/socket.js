import { Server } from 'socket.io';
import { env } from './config/env.js';
import { supabase } from './lib/supabase.js';
import { prisma } from './lib/prisma.js';

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.frontendUrl,
      credentials: true,
    },
  });

  // ---- Connection-time auth ----
  // Both TV and Remote must provide { sessionCode, role, token? }
  // - role 'tv' requires a valid auth token
  // - role 'remote' just needs the code
  io.use(async (socket, next) => {
    try {
      const { sessionCode, role, token } = socket.handshake.auth || {};

      if (!sessionCode || !role) {
        return next(new Error('Missing sessionCode or role'));
      }
      if (!['tv', 'remote'].includes(role)) {
        return next(new Error('Invalid role'));
      }

      const session = await prisma.session.findUnique({
        where: { code: sessionCode.toUpperCase() },
      });
      if (!session) {
        return next(new Error('Invalid session code'));
      }

      // TV must be the same user who created the session
      if (role === 'tv') {
        if (!token) {
          return next(new Error('TV requires auth token'));
        }
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data?.user) {
          return next(new Error('Invalid token'));
        }
        if (data.user.id !== session.userId) {
          return next(new Error('TV must be hosted by session owner'));
        }
        socket.data.user = data.user;
      }

      // Attach session info to socket
      socket.data.sessionCode = session.code;
      socket.data.sessionId = session.id;
      socket.data.role = role;
      next();
    } catch (err) {
      console.error('[socket.auth] error:', err);
      next(new Error('Auth failed'));
    }
  });

  // ---- Connection handler ----
  io.on('connection', async (socket) => {
    const { sessionCode, sessionId, role } = socket.data;
    const room = `session-${sessionCode}`;

    console.log(`[socket] ${role} connected: ${socket.id} -> ${room}`);

    // Join the session room
    await socket.join(room);

    // Update DB with this socket's ID
    const update = role === 'tv'
      ? { tvSocketId: socket.id }
      : { remoteSocketId: socket.id };
    await prisma.session.update({
      where: { id: sessionId },
      data: { ...update, lastActivity: new Date() },
    });

    // Notify the room
    socket.to(room).emit('peer-connected', { role });

    // If both sides are now connected, emit 'paired' to both
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { tvSocketId: true, remoteSocketId: true },
    });
    if (session.tvSocketId && session.remoteSocketId) {
      io.to(room).emit('paired', { sessionCode });
    }

    // ---- Disconnect handler ----
    socket.on('disconnect', async (reason) => {
      console.log(`[socket] ${role} disconnected: ${socket.id} (${reason})`);
      const clear = role === 'tv'
        ? { tvSocketId: null }
        : { remoteSocketId: null };
      try {
        await prisma.session.update({
          where: { id: sessionId },
          data: clear,
        });
      } catch (err) {
        // Session might be gone; ignore
      }
      socket.to(room).emit('peer-disconnected', { role });
    });

    // ---- Channel change events (Step 7) ----
    socket.on('channel_change', async (payload) => {
      // Only the Remote should send channel changes
      if (role !== 'remote') {
        return;
      }

      try {
        const { channel: targetChannel, direction } = payload || {};

        // Get current session to know what channel we're on
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
          select: { currentChannelId: true },
        });

        let newChannelNumber;

        if (direction === 'up' || direction === 'down') {
          // Compute next/prev channel number
          const allChannels = await prisma.channel.findMany({
            orderBy: { number: 'asc' },
            select: { id: true, number: true },
          });
          const currentIdx = session.currentChannelId
            ? allChannels.findIndex((c) => c.id === session.currentChannelId)
            : 0;
          const delta = direction === 'up' ? 1 : -1;
          const nextIdx = (currentIdx + delta + allChannels.length) % allChannels.length;
          newChannelNumber = allChannels[nextIdx].number;
        } else if (typeof targetChannel === 'number') {
          newChannelNumber = targetChannel;
        } else {
          console.warn('[socket] invalid channel_change payload:', payload);
          return;
        }

        // Look up the channel and fetch a video
        const channel = await prisma.channel.findUnique({
          where: { number: newChannelNumber },
          select: { id: true, number: true, name: true },
        });
        if (!channel) {
          socket.emit('error_message', { message: `No channel ${newChannelNumber}` });
          return;
        }

        const candidates = await prisma.videoPool.findMany({
          where: { channelId: channel.id, isBroken: false },
          select: { youtubeId: true, title: true, durationSec: true },
        });
        if (candidates.length === 0) {
          socket.emit('error_message', { message: `No videos for ${channel.name}` });
          return;
        }

        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        const offsetSec = Math.floor(Math.random() * Math.max(1, pick.durationSec - 30));

        // Persist current channel on the session
        await prisma.session.update({
          where: { id: sessionId },
          data: { currentChannelId: channel.id, lastActivity: new Date() },
        });

        // Broadcast the tune event to everyone in the room (TV + Remote both get it)
        io.to(room).emit('tune', {
          channel,
          video: {
            youtubeId: pick.youtubeId,
            title: pick.title,
            durationSec: pick.durationSec,
          },
          offsetSec,
        });
      } catch (err) {
        console.error('[socket.channel_change] error:', err);
        socket.emit('error_message', { message: 'Channel change failed' });
      }
    });

    // ---- Power off (Remote disconnect intent) ----
    socket.on('power_off', () => {
      if (role !== 'remote') return;
      // Just disconnect this socket; TV's peer-disconnected handler will fire
      socket.disconnect(true);
    });
    socket.on('ping', () => socket.emit('pong', { time: Date.now() }));
  });

  return io;
}