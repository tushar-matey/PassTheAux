import youtubeService from '../services/youtubeService.js';
import Room from '../models/Room.js';

// @desc    Search YouTube videos/tracks with live queue-matching
// @route   GET /api/search?q=<query>&roomCode=<code>
export const searchTracks = async (req, res) => {
  try {
    const { q, roomCode } = req.query;

    if (!q || !q.trim()) {
      return res.json({ success: true, tracks: [] });
    }

    // Search YouTube via YouTube Data API v3
    const searchResults = await youtubeService.searchVideos(q.trim());

    // If roomCode is provided, enrich search results with current room queue status
    if (roomCode) {
      const room = await Room.findOne({ code: roomCode.toUpperCase() });
      if (room) {
        const currentUserId = req.user ? req.user._id.toString() : null;
        const activeQueue = room.queue.filter((t) => !t.played);

        const enrichedTracks = searchResults.map((track) => {
          const queuedTrack = activeQueue.find(
            (qt) => qt.youtubeVideoId === track.youtubeVideoId
          );

          const isCurrentTrack =
            room.currentTrack &&
            room.currentTrack.youtubeVideoId === track.youtubeVideoId;

          if (queuedTrack) {
            const userVoted = currentUserId
              ? queuedTrack.votes.some((v) => v.userId.toString() === currentUserId)
              : false;

            return {
              ...track,
              inQueue: true,
              queueTrackId: queuedTrack._id,
              votesCount: queuedTrack.votes.length,
              userVoted: userVoted,
              isNowPlaying: isCurrentTrack
            };
          }

          return {
            ...track,
            inQueue: false,
            queueTrackId: null,
            votesCount: 0,
            userVoted: false,
            isNowPlaying: isCurrentTrack
          };
        });

        return res.json({
          success: true,
          query: q,
          tracks: enrichedTracks
        });
      }
    }

    return res.json({
      success: true,
      query: q,
      tracks: searchResults.map((t) => ({
        ...t,
        inQueue: false,
        userVoted: false,
        votesCount: 0,
        isNowPlaying: false
      }))
    });
  } catch (error) {
    console.error('Search controller error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
