import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to Render server with id:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.warn('[Socket.IO] Connection error:', error.message);
    });
  }
  return socket;
};

export const joinSocketRoom = (roomCode, user) => {
  const s = getSocket();
  if (s && roomCode) {
    s.emit('join-room', { roomCode, user });
  }
};

export const leaveSocketRoom = (roomCode, userId) => {
  const s = getSocket();
  if (s && roomCode) {
    s.emit('leave-room', { roomCode, userId });
  }
};

export const sendChatMessage = (roomCode, message, user) => {
  const s = getSocket();
  if (s && roomCode && message) {
    s.emit('send-message', { roomCode, message, user });
  }
};
