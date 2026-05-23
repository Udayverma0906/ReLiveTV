import { Server } from 'socket.io';
import { env } from './config/env.js';
import { supabase } from './lib/supabase.js';
import { prisma } from './lib/prisma.js';

/**
 * Get the current scheduled video for a channel.
 * Falls back to a random pool pick if the schedule has nothing for now.
 * Same shape as REST /api/channels/:id/current — single source of truth.
 */
async function getCurrentVideoForChannel(channelId) {
  const now = new Date();

  // Schedule lookup (Step 5)
  const entry = await prisma.scheduleEntry.findFirst({
    where: {
      channelId,
      startTime: { lte: now },
      endTime: { gt: now },
    },
  });

  if (entry) {
    return {
      video: {
        youtubeId: entry.videoYoutubeId,
        title: entry.title,
        durationSec: entry.durationSec,
      },
      offsetSec: Math.floor((now - entry.startTime) / 1000),
      synced: true,
    };
  }

  // Fallback: schedule has no entry covering "now" — pick a random pool video
  const candidates = await prisma.videoPool.findMany({
    where: { channelId, isBroken: false },
    select: { youtubeId: true, title: true, durationSec: true },
  });

  if (candidates.length === 0) return null;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    video: {
      youtubeId: pick.youtubeId,
      title: pick.title,
      durationSec: pick.durationSec,
    },
    offsetSec: 0,         // start at beginning, not random
    synced: false,
  };
}

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.frontendUrls,
      credentials: true,
    },
  });

  // ---- Connection-time auth ----
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
        return next(new Error('Session expired or invalid'));
      }

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

    await socket.join(room);

    const update = role === 'tv'
      ? { tvSocketId: socket.id }
      : { remoteSocketId: socket.id };
    await prisma.session.update({
      where: { id: sessionId },
      data: { ...update, lastActivity: new Date() },
    });

    socket.to(room).emit('peer-connected', { role });

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

      if (role === 'tv') {
        try {
          await prisma.session.update({
            where: { id: sessionId },
            data: { tvSocketId: null, lastActivity: new Date() },
          });
        } catch {}
        socket.to(room).emit('peer-disconnected', { role, reconnectGraceMs: 60000 });
      } else {
        try {
          await prisma.session.update({
            where: { id: sessionId },
            data: { remoteSocketId: null },
          });
        } catch {}
        socket.to(room).emit('peer-disconnected', { role });
      }
    });

    // ---- Channel change events ----
    socket.on('channel_change', async (payload) => {
      if (role !== 'remote') return;

      try {
        const { channel: targetChannel, direction } = payload || {};

        const session = await prisma.session.findUnique({
          where: { id: sessionId },
          select: { currentChannelId: true },
        });

        let newChannelNumber;

        if (direction === 'up' || direction === 'down') {
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

        // ↓ ADD THE NO-OP CHECK HERE ↓
if (session.currentChannelId) {
  const currentChannel = await prisma.channel.findUnique({
    where: { id: session.currentChannelId },
    select: { number: true },
  });
  if (currentChannel && currentChannel.number === newChannelNumber) {
    return;
  }
}

        const channel = await prisma.channel.findUnique({
          where: { number: newChannelNumber },
          select: { id: true, number: true, name: true },
        });
        if (!channel) {
          socket.emit('error_message', { message: `No channel ${newChannelNumber}` });
          return;
        }

        // ---- Step 5: schedule-aware video lookup ----
        const result = await getCurrentVideoForChannel(channel.id);
        if (!result) {
          socket.emit('error_message', { message: `No videos for ${channel.name}` });
          return;
        }

        await prisma.session.update({
          where: { id: sessionId },
          data: { currentChannelId: channel.id, lastActivity: new Date() },
        });

        io.to(room).emit('tune', {
          channel,
          video: result.video,
          offsetSec: result.offsetSec,
        });
      } catch (err) {
        console.error('[socket.channel_change] error:', err);
        socket.emit('error_message', { message: 'Channel change failed' });
      }
    });

    // ---- Power off (Remote disconnect intent) ----
    socket.on('power_off', () => {
      if (role !== 'remote') return;
      socket.disconnect(true);
    });

    // ---- Volume + mute relay ----
    socket.on('volume_change', (payload) => {
      if (role !== 'remote') return;
      socket.to(room).emit('volume_change', payload);
    });

    socket.on('mute_toggle', () => {
      if (role !== 'remote') return;
      socket.to(room).emit('mute_toggle');
    });

    socket.on('ping', () => socket.emit('pong', { time: Date.now() }));
  });

  return io;
}