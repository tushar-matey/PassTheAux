import { Server } from 'socket.io';
import Room from '../models/Room.js';
import User from '../models/User.js';
import playbackService from './playbackService.js';

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

      // Host notifies that current YouTube video ended
      socket.on('track-ended', async ({ roomCode, youtubeVideoId }) => {
        try {
          if (!roomCode) return;
          const code = roomCode.toUpperCase();
          const room = await Room.findOne({ code });
          if (!room) return;

          // Prevent race conditions: only advance if the ended track matches the currentTrack
          if (
            room.currentTrack &&
            (!youtubeVideoId || room.currentTrack.youtubeVideoId === youtubeVideoId)
          ) {
            console.log(
              `[Socket] Host client reported track-ended in room ${code}. Advancing to next highest-voted track...`
            );
            await playbackService.playNextTrack(code);
          }
        } catch (err) {
          console.error('[Socket] track-ended error:', err);
        }
      });

      // Host periodically broadcasts playback state & progress for listener sync
      socket.on('playback-sync', ({ roomCode, progressSec, isPlaying, youtubeVideoId }) => {
        if (!roomCode) return;
        const code = roomCode.toUpperCase();
        socket.to(code).emit('playback-sync', {
          progressSec: typeof progressSec === 'number' ? progressSec : 0,
          isPlaying: Boolean(isPlaying),
          youtubeVideoId,
          timestamp: Date.now()
        });
      });

      // Host seeks in video -> broadcast seek position to all listeners
      socket.on('seek-playback', ({ roomCode, progressSec }) => {
        if (!roomCode) return;
        const code = roomCode.toUpperCase();
        socket.to(code).emit('seek-playback', {
          progressSec: typeof progressSec === 'number' ? progressSec : 0,
          timestamp: Date.now()
        });
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

    console.log('[Socket] Socket.IO server initialized with YouTube playback sync');
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

  // Broadcast sync event directly from backend controller
  broadcastPlaybackSync(roomCode, syncData) {
    if (!this.io || !roomCode) return;
    this.io.to(roomCode.toUpperCase()).emit('playback-sync', syncData);
  }
}

const socketService = new SocketService();
export default socketService;
