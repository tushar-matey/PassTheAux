import Room from '../models/Room.js';
import playbackService from '../services/playbackService.js';
import socketService from '../services/socketService.js';

// @desc    Get current sorted queue for a room
// @route   GET /api/rooms/:code/queue
export const getQueue = async (req, res) => {
  try {
    const { code } = req.params;
    const room = await Room.findOne({ code: code.toUpperCase() });

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const sortedQueue = room.getSortedQueue();

    return res.json({
      success: true,
      queue: sortedQueue,
      currentTrack: room.currentTrack
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a song to room queue (with 1 auto-vote from adder)
// @route   POST /api/rooms/:code/queue
export const addToQueue = async (req, res) => {
  try {
    const { code } = req.params;
    const {
      spotifyTrackId,
      name,
      artist,
      albumArt,
      albumName,
      durationMs,
      uri,
      previewUrl
    } = req.body;

    if (!spotifyTrackId || !name || !artist || !uri) {
      return res.status(400).json({
        success: false,
        message: 'Missing track details (spotifyTrackId, name, artist, uri required).'
      });
    }

    const room = await Room.findOne({ code: code.toUpperCase() }).populate('hostUserId');
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const userId = req.user._id;
    const userName = req.user.name;

    // Check if song is already in active queue
    const existingIndex = room.queue.findIndex(
      (t) => !t.played && t.spotifyTrackId === spotifyTrackId
    );

    if (existingIndex >= 0) {
      // If already in queue, toggle vote for this user instead of duplicating!
      const existingTrack = room.queue[existingIndex];
      const hasVoted = existingTrack.votes.some(
        (v) => v.userId.toString() === userId.toString()
      );

      if (!hasVoted) {
        existingTrack.votes.push({ userId, votedAt: new Date() });
      }

      await room.save();
      const updatedQueue = room.getSortedQueue();
      socketService.broadcastQueueUpdated(room.code, updatedQueue);

      return res.json({
        success: true,
        message: 'Song was already in queue. Added your vote!',
        queue: updatedQueue,
        track: existingTrack
      });
    }

    // Create new track subdocument
    const newTrack = {
      spotifyTrackId,
      name,
      artist,
      albumArt: albumArt || '',
      albumName: albumName || '',
      durationMs: durationMs || 180000,
      uri,
      previewUrl: previewUrl || null,
      addedBy: {
        userId,
        name: userName
      },
      votes: [
        {
          userId,
          votedAt: new Date()
        }
      ],
      addedAt: new Date(),
      played: false
    };

    room.queue.push(newTrack);
    await room.save();

    let sortedQueue = room.getSortedQueue();

    // If no song is currently playing, start playing this song immediately!
    const isCurrentlyPlaying =
      room.currentTrack &&
      room.currentTrack.spotifyTrackId &&
      room.currentTrack.isPlaying;

    if (!isCurrentlyPlaying && room.settings?.autoPlay !== false) {
      console.log(`[QueueController] Room ${room.code} is idle. Auto-starting first track.`);
      const playResult = await playbackService.playNextTrack(room.code, room.hostUserId);
      sortedQueue = playResult.queue;
    } else {
      socketService.broadcastQueueUpdated(room.code, sortedQueue);
    }

    return res.status(201).json({
      success: true,
      message: 'Song added to queue successfully',
      queue: sortedQueue
    });
  } catch (error) {
    console.error('addToQueue error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle vote on an existing queued song
// @route   POST /api/rooms/:code/queue/:trackId/vote
export const toggleVote = async (req, res) => {
  try {
    const { code, trackId } = req.params;
    const userId = req.user._id;

    const room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Find track by _id or spotifyTrackId
    let track = room.queue.id(trackId);
    if (!track) {
      track = room.queue.find(
        (t) => !t.played && t.spotifyTrackId === trackId
      );
    }

    if (!track || track.played) {
      return res.status(404).json({
        success: false,
        message: 'Active track not found in room queue.'
      });
    }

    const voteIndex = track.votes.findIndex(
      (v) => v.userId.toString() === userId.toString()
    );

    let userVoted = false;
    if (voteIndex >= 0) {
      // Remove vote
      track.votes.splice(voteIndex, 1);
      userVoted = false;
    } else {
      // Add vote
      track.votes.push({
        userId,
        votedAt: new Date()
      });
      userVoted = true;
    }

    await room.save();

    const sortedQueue = room.getSortedQueue();

    // Broadcast vote update and full re-sorted queue
    socketService.broadcastVoteUpdated(room.code, track._id.toString(), track.votes, sortedQueue);

    return res.json({
      success: true,
      userVoted,
      voteCount: track.votes.length,
      trackId: track._id,
      queue: sortedQueue
    });
  } catch (error) {
    console.error('toggleVote error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove song from queue
// @route   DELETE /api/rooms/:code/queue/:trackId
export const removeFromQueue = async (req, res) => {
  try {
    const { code, trackId } = req.params;
    const userId = req.user._id;

    const room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    let track = room.queue.id(trackId);
    if (!track) {
      track = room.queue.find((t) => !t.played && t.spotifyTrackId === trackId);
    }

    if (!track) return res.status(404).json({ success: false, message: 'Track not found in queue' });

    const isHost = room.hostUserId.toString() === userId.toString();
    const isAdder = track.addedBy?.userId?.toString() === userId.toString();

    if (!isHost && !isAdder) {
      return res.status(403).json({
        success: false,
        message: 'Only the host or track adder can remove this track from queue.'
      });
    }

    room.queue.pull(track._id);
    await room.save();

    const sortedQueue = room.getSortedQueue();
    socketService.broadcastQueueUpdated(room.code, sortedQueue);

    return res.json({ success: true, queue: sortedQueue });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
