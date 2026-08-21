import Room from '../models/Room.js';
import playbackService from '../services/playbackService.js';
import socketService from '../services/socketService.js';

// @desc    Toggle Play/Pause for room
// @route   POST /api/player/:code/toggle
export const togglePlay = async (req, res) => {
  try {
    const { code } = req.params;
    const { play } = req.body; // optional boolean

    const currentTrack = await playbackService.togglePlayback(
      code,
      req.user,
      typeof play === 'boolean' ? play : null
    );

    return res.json({ success: true, currentTrack });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Skip to next highest-voted track in queue
// @route   POST /api/player/:code/skip
export const skipTrack = async (req, res) => {
  try {
    const { code } = req.params;
    const result = await playbackService.skipCurrentTrack(code, req.user);
    return res.json({
      success: true,
      currentTrack: result.currentTrack,
      queue: result.queue
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Host syncs current YouTube playback progress to all clients
// @route   POST /api/player/:code/sync
export const syncPlayback = async (req, res) => {
  try {
    const { code } = req.params;
    const { progressSec, isPlaying } = req.body;

    const room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    const isHost = room.hostUserId.toString() === req.user._id.toString();
    if (!isHost) {
      return res.status(403).json({ success: false, message: 'Only host can broadcast playback sync' });
    }

    if (room.currentTrack) {
      if (typeof isPlaying === 'boolean') room.currentTrack.isPlaying = isPlaying;
      if (typeof progressSec === 'number') {
        room.currentTrack.progressSec = progressSec;
        room.currentTrack.progressMs = progressSec * 1000;
      }
      room.currentTrack.lastSyncedAt = new Date();
      await room.save();
    }

    socketService.broadcastPlaybackSync(room.code, {
      isPlaying: typeof isPlaying === 'boolean' ? isPlaying : room.currentTrack?.isPlaying,
      progressSec: typeof progressSec === 'number' ? progressSec : room.currentTrack?.progressSec,
      youtubeVideoId: room.currentTrack?.youtubeVideoId
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current playback status
// @route   GET /api/player/:code/status
export const getPlaybackStatus = async (req, res) => {
  try {
    const { code } = req.params;
    const room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    return res.json({
      success: true,
      currentTrack: room.currentTrack
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
