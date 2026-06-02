import { io } from 'socket.io-client';

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : '';

let socket = null;

/**
 * Connect (or return existing) socket with JWT auth.
 * Safe to call multiple times — won't create duplicate connections.
 */
export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  // Clean up stale socket if any
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = io(API_BASE, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () =>
    console.log('💞 Socket connected:', socket.id)
  );
  socket.on('connect_error', (err) =>
    console.warn('Socket connect error:', err.message)
  );

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    console.log('💔 Socket disconnected');
  }
};
