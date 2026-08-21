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
    const devices = await spotifyService.getDevices(req.user);
    return res.json({ success: true, devices });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Select active Spotify playback device for room
// @route   POST /api/player/:code/device
export const setRoomDevice = async (req, res) => {
  try {
    const { code } = req.params;
    const { deviceId, deviceName } = req.body;

    const room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    if (room.hostUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only room host can select device' });
    }

    room.activeDeviceId = deviceId;
    room.activeDeviceName = deviceName || 'Spotify Device';
    await room.save();

    // Transfer Spotify playback if host is connected
    try {
      await spotifyService.transferPlayback(req.user, deviceId, false);
    } catch (e) {
      console.warn('Could not transfer Spotify device immediately:', e.message);
    }

    return res.json({
      success: true,
      activeDeviceId: room.activeDeviceId,
      activeDeviceName: room.activeDeviceName
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
