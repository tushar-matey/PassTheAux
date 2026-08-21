import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(window.location.origin, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected with id:', socket.id);
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
