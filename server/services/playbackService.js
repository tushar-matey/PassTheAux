import Room from '../models/Room.js';
import User from '../models/User.js';
import socketService from './socketService.js';

class PlaybackService {
  constructor() {
    this.intervalId = null;
    this.checkIntervalMs = 4000; // Check rooms every 4s
  }

  // Start background playback monitoring loop (fallback in case client track-ended fails)
  startMonitor() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.checkActiveRooms().catch((err) => {
        console.error('[PlaybackService] Monitor loop error:', err.message);
      });
    }, this.checkIntervalMs);

    console.log('[PlaybackService] Active YouTube playback monitor started');
  }

  stopMonitor() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Periodic check for rooms whose current track duration has elapsed (+ 5s grace period)
  async checkActiveRooms() {
    const activeRooms = await Room.find({
      'currentTrack.isPlaying': true,
      'currentTrack.startedAt': { $ne: null }
    }).populate('hostUserId');

    const now = Date.now();

    for (const room of activeRooms) {
      if (!room.currentTrack || !room.currentTrack.durationSec) continue;

      const durationMs = (room.currentTrack.durationSec || 0) * 1000;
      if (durationMs <= 0) continue;

      const elapsed = now - new Date(room.currentTrack.startedAt).getTime();

      // Grace period of 5 seconds to give YouTube player time to fire onEnded event
      if (elapsed >= durationMs + 5000) {
        console.log(
          `[PlaybackService] Track duration finished in room ${room.code}: "${room.currentTrack.title}". Advancing queue...`
        );
        await this.playNextTrack(room.code, room.hostUserId);
      }
    }
  }

  // Play next track from the queue
  async playNextTrack(roomCode, hostUser = null) {
    try {
      const room = await Room.findOne({ code: roomCode.toUpperCase() }).populate('hostUserId');
      if (!room) return null;

      const sortedQueue = room.getSortedQueue();

      // If queue is empty, set currentTrack to not playing
      if (sortedQueue.length === 0) {
        if (room.currentTrack && room.currentTrack.youtubeVideoId) {
          // Move current track to history
          room.history.unshift({
            youtubeVideoId: room.currentTrack.youtubeVideoId,
            title: room.currentTrack.title,
            channelTitle: room.currentTrack.channelTitle,
            thumbnailUrl: room.currentTrack.thumbnailUrl,
            durationSec: room.currentTrack.durationSec,
            durationMs: (room.currentTrack.durationSec || 0) * 1000,
            addedBy: room.currentTrack.addedBy,
            votes: [],
            addedAt: room.currentTrack.startedAt || new Date(),
            played: true,
            playedAt: new Date()
          });
        }

        room.currentTrack = {
          youtubeVideoId: null,
          title: null,
          channelTitle: null,
          thumbnailUrl: '',
          durationSec: 0,
          durationMs: 0,
          addedBy: null,
          startedAt: null,
          isPlaying: false,
          progressSec: 0,
          progressMs: 0,
          lastSyncedAt: new Date()
        };

        await room.save();

        socketService.broadcastTrackChanged(room.code, room.currentTrack, []);
        return { room, currentTrack: null, queue: [] };
      }

      // Next track is the first item in sorted queue (highest votes, earliest added)
      const nextTrack = sortedQueue[0];

      // Mark this track as played in room.queue
      const trackInQueue = room.queue.id(nextTrack._id);
      if (trackInQueue) {
        trackInQueue.played = true;
        trackInQueue.playedAt = new Date();
      }

      // Move previous current track to history if valid
      if (room.currentTrack && room.currentTrack.youtubeVideoId) {
        room.history.unshift({
          youtubeVideoId: room.currentTrack.youtubeVideoId,
          title: room.currentTrack.title,
          channelTitle: room.currentTrack.channelTitle,
          thumbnailUrl: room.currentTrack.thumbnailUrl,
          durationSec: room.currentTrack.durationSec,
          durationMs: (room.currentTrack.durationSec || 0) * 1000,
          addedBy: room.currentTrack.addedBy,
          votes: [],
          addedAt: room.currentTrack.startedAt || new Date(),
          played: true,
          playedAt: new Date()
        });

        // Cap history to 50 items
        if (room.history.length > 50) {
          room.history = room.history.slice(0, 50);
        }
      }

      // Set new current track
      room.currentTrack = {
        youtubeVideoId: nextTrack.youtubeVideoId,
        title: nextTrack.title,
        channelTitle: nextTrack.channelTitle,
        thumbnailUrl: nextTrack.thumbnailUrl,
        durationSec: nextTrack.durationSec || 0,
        durationMs: (nextTrack.durationSec || 0) * 1000,
        addedBy: nextTrack.addedBy,
        startedAt: new Date(),
        isPlaying: true,
        progressSec: 0,
        progressMs: 0,
        lastSyncedAt: new Date()
      };

      await room.save();

      const remainingQueue = room.getSortedQueue();
      socketService.broadcastTrackChanged(room.code, room.currentTrack, remainingQueue);

      console.log(
        `[PlaybackService] Room ${room.code} Now Playing: "${room.currentTrack.title}" (${room.currentTrack.youtubeVideoId})`
      );

      return { room, currentTrack: room.currentTrack, queue: remainingQueue };
    } catch (err) {
      console.error('[PlaybackService] playNextTrack error:', err);
      throw err;
    }
  }

  // Skip current track (Host only)
  async skipCurrentTrack(roomCode, user) {
    const room = await Room.findOne({ code: roomCode.toUpperCase() }).populate('hostUserId');
    if (!room) throw new Error('Room not found');

    const isHost = room.hostUserId._id.toString() === user._id.toString();
    if (!isHost) {
      throw new Error('Only the room host can skip tracks.');
    }

    return await this.playNextTrack(room.code, room.hostUserId);
  }

  // Toggle Play/Pause
  async togglePlayback(roomCode, user, playState = null) {
    const room = await Room.findOne({ code: roomCode.toUpperCase() }).populate('hostUserId');
    if (!room) throw new Error('Room not found');

    const isHost = room.hostUserId._id.toString() === user._id.toString();
    if (!isHost) {
      throw new Error('Only the room host can control playback.');
    }

    if (!room.currentTrack || !room.currentTrack.youtubeVideoId) {
      // If nothing currently playing, start next track from queue
      return await this.playNextTrack(room.code, room.hostUserId);
    }

    const newPlayingState = playState !== null ? playState : !room.currentTrack.isPlaying;

    if (newPlayingState) {
      // Resume
      room.currentTrack.isPlaying = true;
      room.currentTrack.startedAt = new Date(Date.now() - (room.currentTrack.progressSec || 0) * 1000);
      room.currentTrack.lastSyncedAt = new Date();
    } else {
      // Pause
      room.currentTrack.isPlaying = false;
      if (room.currentTrack.startedAt) {
        const elapsedSec = Math.floor((Date.now() - new Date(room.currentTrack.startedAt).getTime()) / 1000);
        room.currentTrack.progressSec = Math.min(
          room.currentTrack.durationSec || 0,
          Math.max(0, elapsedSec)
        );
        room.currentTrack.progressMs = room.currentTrack.progressSec * 1000;
      }
      room.currentTrack.lastSyncedAt = new Date();
    }

    await room.save();

    socketService.broadcastPlaybackState(room.code, {
      isPlaying: room.currentTrack.isPlaying,
      progressSec: room.currentTrack.progressSec,
      progressMs: (room.currentTrack.progressSec || 0) * 1000,
      startedAt: room.currentTrack.startedAt,
      currentTrack: room.currentTrack
    });

    return room.currentTrack;
  }
}

const playbackService = new PlaybackService();
export default playbackService;
