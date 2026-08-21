import { Server } from 'socket.io';
import Room from '../models/Room.js';
import User from '../models/User.js';

class SocketService {
  constructor() {
    this.io = null;
  }

  init(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: (origin, callback) => {
          callback(null, true);
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
      },
      pingTimeout: 60000
    });

    this.io.on('connection', (socket) => {
      // User joins a specific room
      socket.on('join-room', async ({ roomCode, user }) => {
        try {
          if (!roomCode) return;
          const code = roomCode.toUpperCase();
          socket.join(code);
          socket.roomCode = code;
          socket.userId = user?._id || user?.id;
          socket.userName = user?.name || 'Anonymous Listener';

          console.log(`[Socket] ${socket.userName} (${socket.id}) joined room ${code}`);

          // Update member in DB if user is provided
          if (socket.userId) {
            const room = await Room.findOne({ code });
            if (room) {
              const existingMemberIndex = room.members.findIndex(
                (m) => m.userId.toString() === socket.userId.toString()
              );

              if (existingMemberIndex >= 0) {
                room.members[existingMemberIndex].isOnline = true;
                room.members[existingMemberIndex].socketId = socket.id;
              } else {
                room.members.push({
                  userId: socket.userId,
                  name: socket.userName,
                  isOnline: true,
                  socketId: socket.id,
                  joinedAt: new Date()
                });
              }
              await room.save();

              // Broadcast updated member list to room
              this.io.to(code).emit('members-updated', {
                members: room.members,
                joinedMember: {
                  userId: socket.userId,
                  name: socket.userName
                }
              });
            }
          }

          socket.emit('joined-room-success', { roomCode: code });
        } catch (err) {
          console.error('[Socket] join-room error:', err);
        }
      });

      // User explicitly leaves room
      socket.on('leave-room', async ({ roomCode, userId }) => {
        try {
          if (!roomCode) return;
          const code = roomCode.toUpperCase();
          socket.leave(code);

          if (userId) {
            await this.handleUserLeave(code, userId, socket.id);
          }
        } catch (err) {
          console.error('[Socket] leave-room error:', err);
        }
      });

      // Real-time room chat / reaction
      socket.on('send-message', ({ roomCode, message, user }) => {
        if (!roomCode || !message) return;
        const code = roomCode.toUpperCase();
        this.io.to(code).emit('chat-message', {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          user: user || { name: 'Guest' },
          text: message,
          timestamp: new Date()
        });
      });

      // Disconnect event
      socket.on('disconnect', async () => {
        if (socket.roomCode && socket.userId) {
          console.log(`[Socket] ${socket.userName} disconnected from ${socket.roomCode}`);
          await this.handleUserLeave(socket.roomCode, socket.userId, socket.id);
        }
      });
    });

    console.log('[Socket] Socket.IO server initialized');
  }

  async handleUserLeave(roomCode, userId, socketId) {
    try {
      const room = await Room.findOne({ code: roomCode });
      if (!room) return;

      const memberIndex = room.members.findIndex(
        (m) => m.userId.toString() === userId.toString()
      );

      if (memberIndex >= 0) {
        room.members[memberIndex].isOnline = false;
        room.members[memberIndex].socketId = null;
        await room.save();

        this.io.to(roomCode).emit('members-updated', {
          members: room.members,
          leftMemberId: userId
        });
      }
    } catch (err) {
      console.error('[Socket] handleUserLeave error:', err);
    }
  }

  // Broadcast sorted queue updates
  broadcastQueueUpdated(roomCode, queue) {
    if (!this.io || !roomCode) return;
    this.io.to(roomCode.toUpperCase()).emit('queue-updated', { queue });
  }

  // Broadcast single vote change + full re-sorted queue
  broadcastVoteUpdated(roomCode, trackId, votes, queue) {
    if (!this.io || !roomCode) return;
    this.io.to(roomCode.toUpperCase()).emit('vote-updated', {
      trackId,
      votes,
      queue
    });
  }

  // Broadcast track changed event
  broadcastTrackChanged(roomCode, currentTrack, queue) {
    if (!this.io || !roomCode) return;
    this.io.to(roomCode.toUpperCase()).emit('track-changed', {
      currentTrack,
      queue
    });
  }

  // Broadcast player playback state (play/pause/seek)
  broadcastPlaybackState(roomCode, playbackState) {
    if (!this.io || !roomCode) return;
    this.io.to(roomCode.toUpperCase()).emit('playback-state', playbackState);
  }
}

const socketService = new SocketService();
export default socketService;
