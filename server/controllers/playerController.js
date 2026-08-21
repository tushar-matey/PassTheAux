import Room from '../models/Room.js';
import playbackService from '../services/playbackService.js';
import spotifyService from '../services/spotifyService.js';

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

// @desc    Get host's active Spotify devices
// @route   GET /api/player/devices
export const getHostDevices = async (req, res) => {
  try {
    const result = await spotifyService.getDevices(req.user);
    if (!result.success && result.code === 'PREMIUM_REQUIRED') {
      return res.status(403).json(result);
    }
    if (!result.success && result.code === 'NOT_CONNECTED') {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, code: 'SERVER_ERROR', message: error.message });
  }
};

// @desc    Select active Spotify playback device for room
// @route   POST /api/player/:code/device
export const setRoomDevice = async (req, res) => {
  try {
    const { code } = req.params;
    const { deviceId, deviceName } = req.body;

    if (!deviceId) {
      return res.status(400).json({ success: false, message: 'deviceId is required' });
    }

    const room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    if (room.hostUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only room host can select device' });
    }

    room.activeDeviceId = deviceId;
    room.activeDeviceName = deviceName || 'Spotify Device';
    await room.save();

    // Transfer Spotify playback to make it the active device
    let transferSuccess = false;
    let transferError = null;
    try {
      await spotifyService.transferPlayback(req.user, deviceId, false);
      transferSuccess = true;
    } catch (e) {
      transferError = e.message;
      console.warn('[PlayerController] Transfer device warning:', e.message);
    }

    return res.json({
      success: true,
      activeDeviceId: room.activeDeviceId,
      activeDeviceName: room.activeDeviceName,
      transferred: transferSuccess,
      transferMessage: transferError
    });
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
      currentTrack: room.currentTrack,
      activeDeviceId: room.activeDeviceId,
      activeDeviceName: room.activeDeviceName
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
