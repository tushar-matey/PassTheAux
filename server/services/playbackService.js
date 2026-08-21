import Room from '../models/Room.js';
import User from '../models/User.js';
import spotifyService from './spotifyService.js';
import socketService from './socketService.js';

class PlaybackService {
  constructor() {
    this.intervalId = null;
    this.checkIntervalMs = 3000; // Check rooms every 3s
  }

  // Start background playback monitoring loop
  startMonitor() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.checkActiveRooms().catch((err) => {
        console.error('[PlaybackService] Monitor loop error:', err.message);
      });
    }, this.checkIntervalMs);

    console.log('[PlaybackService] Active playback monitor started');
  }

  stopMonitor() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Periodic check for rooms whose current track has finished
  async checkActiveRooms() {
    const activeRooms = await Room.find({
      'currentTrack.isPlaying': true,
      'currentTrack.startedAt': { $ne: null }
    }).populate('hostUserId');

    const now = Date.now();

    for (const room of activeRooms) {
      if (!room.currentTrack || !room.currentTrack.durationMs) continue;

      const elapsed = now - new Date(room.currentTrack.startedAt).getTime();

      // If track has reached its duration (+ 1s grace period)
      if (elapsed >= room.currentTrack.durationMs) {
        console.log(
          `[PlaybackService] Track finished in room ${room.code}: "${room.currentTrack.name}". Advancing queue...`
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

      const host = hostUser || room.hostUserId;
      const sortedQueue = room.getSortedQueue();

      // If queue is empty, set currentTrack to not playing
      if (sortedQueue.length === 0) {
        if (room.currentTrack && room.currentTrack.spotifyTrackId) {
          // Move current track to history
          room.history.unshift({
            spotifyTrackId: room.currentTrack.spotifyTrackId,
            name: room.currentTrack.name,
            artist: room.currentTrack.artist,
            albumArt: room.currentTrack.albumArt,
            albumName: room.currentTrack.albumName,
            durationMs: room.currentTrack.durationMs,
            uri: room.currentTrack.uri,
            previewUrl: room.currentTrack.previewUrl,
            addedBy: room.currentTrack.addedBy,
            votes: [],
            addedAt: room.currentTrack.startedAt || new Date(),
            played: true,
            playedAt: new Date()
          });
        }

        room.currentTrack = {
          spotifyTrackId: null,
          name: null,
          artist: null,
          albumArt: '',
          albumName: '',
          durationMs: 0,
          uri: null,
          previewUrl: null,
          addedBy: null,
          startedAt: null,
          isPlaying: false,
          progressMs: 0
        };

        await room.save();

        socketService.broadcastTrackChanged(room.code, room.currentTrack, []);
        return { room, currentTrack: null };
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
      if (room.currentTrack && room.currentTrack.spotifyTrackId) {
        room.history.unshift({
          spotifyTrackId: room.currentTrack.spotifyTrackId,
          name: room.currentTrack.name,
          artist: room.currentTrack.artist,
          albumArt: room.currentTrack.albumArt,
          albumName: room.currentTrack.albumName,
          durationMs: room.currentTrack.durationMs,
          uri: room.currentTrack.uri,
          previewUrl: room.currentTrack.previewUrl,
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
        spotifyTrackId: nextTrack.spotifyTrackId,
        name: nextTrack.name,
        artist: nextTrack.artist,
        albumArt: nextTrack.albumArt,
        albumName: nextTrack.albumName,
        durationMs: nextTrack.durationMs,
        uri: nextTrack.uri,
        previewUrl: nextTrack.previewUrl,
        addedBy: nextTrack.addedBy,
        startedAt: new Date(),
        isPlaying: true,
        progressMs: 0,
        lastSyncedAt: new Date()
      };

      await room.save();

      // Trigger Spotify Playback on Host Device if connected
      if (host) {
        try {
          const playResult = await spotifyService.playTrack(
            host,
            nextTrack.uri,
            room.activeDeviceId,
            0
          );
          console.log(`[PlaybackService] Spotify play trigger:`, playResult);
        } catch (spotifyErr) {
          console.warn('[PlaybackService] Spotify playback trigger warning:', spotifyErr.message);
        }
      }

      const remainingQueue = room.getSortedQueue();
      socketService.broadcastTrackChanged(room.code, room.currentTrack, remainingQueue);

      return { room, currentTrack: room.currentTrack, queue: remainingQueue };
    } catch (err) {
      console.error('[PlaybackService] playNextTrack error:', err);
      throw err;
    }
  }

  // Skip current track
  async skipCurrentTrack(roomCode, user) {
    const room = await Room.findOne({ code: roomCode.toUpperCase() }).populate('hostUserId');
    if (!room) throw new Error('Room not found');

    const isHost = room.hostUserId._id.toString() === user._id.toString();
    if (!isHost) {
      // In future can check voteThresholdToSkip, for now host has authority
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

    if (!room.currentTrack || !room.currentTrack.spotifyTrackId) {
      // If nothing currently playing, start next track from queue
      return await this.playNextTrack(room.code, room.hostUserId);
    }

    const newPlayingState = playState !== null ? playState : !room.currentTrack.isPlaying;

    if (newPlayingState) {
      // Resume
      room.currentTrack.isPlaying = true;
      room.currentTrack.startedAt = new Date(Date.now() - (room.currentTrack.progressMs || 0));
      if (room.hostUserId) {
        await spotifyService.playTrack(
          room.hostUserId,
          room.currentTrack.uri,
          room.activeDeviceId,
          room.currentTrack.progressMs || 0
        );
      }
    } else {
      // Pause
      room.currentTrack.isPlaying = false;
      if (room.currentTrack.startedAt) {
        room.currentTrack.progressMs = Math.min(
          room.currentTrack.durationMs,
          Date.now() - new Date(room.currentTrack.startedAt).getTime()
        );
      }
      if (room.hostUserId) {
        await spotifyService.pauseTrack(room.hostUserId, room.activeDeviceId);
      }
    }

    await room.save();

    socketService.broadcastPlaybackState(room.code, {
      isPlaying: room.currentTrack.isPlaying,
      progressMs: room.currentTrack.progressMs,
      startedAt: room.currentTrack.startedAt,
      currentTrack: room.currentTrack
    });

    return room.currentTrack;
  }
}

const playbackService = new PlaybackService();
export default playbackService;
