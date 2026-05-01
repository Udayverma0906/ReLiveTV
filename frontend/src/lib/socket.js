import { io } from 'socket.io-client';

let currentSocket = null;

/**
 * Get or create a socket connection for a given session.
 * Auto-disconnects any prior socket.
 */
export function connectSocket({ sessionCode, role, token }) {
  if (currentSocket) {
    currentSocket.disconnect();
    currentSocket = null;
  }

  const socket = io(import.meta.env.VITE_WS_URL, {
    auth: { sessionCode, role, token },
    transports: ['websocket'],   // skip the polling fallback
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  currentSocket = socket;
  return socket;
}

export function disconnectSocket() {
  if (currentSocket) {
    currentSocket.disconnect();
    currentSocket = null;
  }
}

export function getSocket() {
  return currentSocket;
}