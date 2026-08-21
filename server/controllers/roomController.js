import Room from '../models/Room.js';
import User from '../models/User.js';
import socketService from '../services/socketService.js';

// Helper to generate unique 6-character uppercase room code
const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude ambiguous 0/O, 1/I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// @desc    Create a new room
// @route   POST /api/rooms
export const createRoom = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user._id;
    const userName = req.user.name;

    // Generate a guaranteed unique room code
    let code = generateRoomCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const existing = await Room.findOne({ code });
      if (!existing) {
        isUnique = true;
      } else {
        code = generateRoomCode();
        attempts++;
      }
    }

    const room = await Room.create({
      code,
      name: name?.trim() || `${userName}'s Session`,
      hostUserId: userId,
      members: [
        {
          userId,
          name: userName,
          isOnline: true,
          joinedAt: new Date()
        }
      ],
      queue: [],
      currentTrack: {
        youtubeVideoId: null,
        title: null,
        channelTitle: null,
        thumbnailUrl: '',
        durationSec: 0,
        durationMs: 0,
        startedAt: null,
        isPlaying: false,
        progressSec: 0,
        progressMs: 0
      }
    });

    const populatedRoom = await Room.findById(room._id).populate(
      'hostUserId',
      'name email isHost'
    );

    return res.status(201).json({
      success: true,
      room: populatedRoom
    });
  } catch (error) {
    console.error('Create room error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Join a room by code
// @route   POST /api/rooms/join
export const joinRoom = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Room code is required' });
    }

    const cleanCode = code.trim().toUpperCase();
    const room = await Room.findOne({ code: cleanCode }).populate(
      'hostUserId',
      'name email isHost'
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: `Room with code "${cleanCode}" not found.`
      });
    }

    // Add member if logged in and not already in member list
    if (req.user) {
      const userId = req.user._id;
      const userName = req.user.name;

      const memberExists = room.members.some(
        (m) => m.userId.toString() === userId.toString()
      );

      if (!memberExists) {
        room.members.push({
          userId,
          name: userName,
          isOnline: true,
          joinedAt: new Date()
        });
        await room.save();
      }
    }

    return res.json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Join room error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get room details by code
// @route   GET /api/rooms/:code
export const getRoom = async (req, res) => {
  try {
    const { code } = req.params;
    const cleanCode = code.trim().toUpperCase();

    const room = await Room.findOne({ code: cleanCode }).populate(
      'hostUserId',
      'name email isHost'
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: `Room "${cleanCode}" not found.`
      });
    }

    // Format room response with sorted active queue
    const sortedQueue = room.getSortedQueue();

    return res.json({
      success: true,
      room: {
        _id: room._id,
        code: room.code,
        name: room.name,
        hostUserId: room.hostUserId,
        members: room.members,
        queue: sortedQueue,
        currentTrack: room.currentTrack,
        history: room.history.slice(0, 20),
        settings: room.settings,
        createdAt: room.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update room settings
// @route   PATCH /api/rooms/:code/settings
export const updateRoomSettings = async (req, res) => {
  try {
    const { code } = req.params;
    const { autoPlay, voteThresholdToSkip } = req.body;

    const room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    if (room.hostUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only host can change room settings' });
    }

    if (typeof autoPlay === 'boolean') room.settings.autoPlay = autoPlay;
    if (typeof voteThresholdToSkip === 'number') room.settings.voteThresholdToSkip = voteThresholdToSkip;

    await room.save();

    return res.json({ success: true, settings: room.settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
