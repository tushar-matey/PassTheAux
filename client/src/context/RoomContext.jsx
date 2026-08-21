import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react';
import { roomApi, queueApi, searchApi, playerApi } from '../services/api';
import { getSocket, joinSocketRoom, leaveSocketRoom } from '../services/socket';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import confetti from 'canvas-confetti';


const RoomContext = createContext(null);

export const RoomProvider = ({ children }) => {
  const { user } = useAuth();
  const { toastSuccess, toastError, toastMusic, toastInfo } = useToast();

  const [room, setRoom] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [members, setMembers] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [activeDeviceName, setActiveDeviceName] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // UI / Loading states
  const [isLoadingRoom, setIsLoadingRoom] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // Chat / Live feed
  const [chatMessages, setChatMessages] = useState([]);

  const isHost = Boolean(
    room &&
    user &&
    (room.hostUserId?._id === user._id || room.hostUserId === user._id)
  );

  // Progress bar sync timer
  useEffect(() => {
    let interval = null;

    if (currentTrack && currentTrack.isPlaying && currentTrack.durationMs > 0) {
      interval = setInterval(() => {
        if (!currentTrack.startedAt) return;
        const elapsed = Date.now() - new Date(currentTrack.startedAt).getTime();
        const clamped = Math.min(elapsed, currentTrack.durationMs);
        setPlaybackProgress(clamped);
      }, 500);
    } else if (currentTrack && !currentTrack.isPlaying) {
      setPlaybackProgress(currentTrack.progressMs || 0);
    } else {
      setPlaybackProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentTrack]);

  // Handle Socket.IO Event Listeners for active room
  useEffect(() => {
    if (!room?.code) return;

    const socket = getSocket();
    joinSocketRoom(room.code, user);

    // Live Queue Updated Event
    const handleQueueUpdated = ({ queue: newQueue }) => {
      setQueue(newQueue || []);
      // Re-sync search results if active
      setSearchResults((prev) =>
        prev.map((item) => {
          const inQ = (newQueue || []).find(
            (q) => q.spotifyTrackId === item.spotifyTrackId
          );
          if (inQ) {
            const hasUserVoted = user
              ? inQ.votes?.some((v) => (v.userId?._id || v.userId) === user._id)
              : false;
            return {
              ...item,
              inQueue: true,
              queueTrackId: inQ._id,
              votesCount: inQ.votes?.length || 0,
              userVoted: hasUserVoted
            };
          }
          return {
            ...item,
            inQueue: false,
            queueTrackId: null,
            votesCount: 0,
            userVoted: false
          };
        })
      );
    };

    // Live Single Vote Updated Event
    const handleVoteUpdated = ({ trackId, votes, queue: newQueue }) => {
      if (newQueue) {
        setQueue(newQueue);
      } else {
        setQueue((prev) =>
          prev.map((t) => (t._id === trackId ? { ...t, votes } : t))
        );
      }
    };

    // Live Track Changed Event
    const handleTrackChanged = ({ currentTrack: newTrack, queue: newQueue }) => {
      setCurrentTrack(newTrack);
      if (newQueue) setQueue(newQueue);

      if (newTrack?.name) {
        toastMusic(`Now Playing: ${newTrack.name} by ${newTrack.artist}`);
        // Delightful celebratory confetti for the promoted track
        try {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.85 }
          });
        } catch (e) { }
      }
    };

    // Live Playback State Event (play/pause/progress)
    const handlePlaybackState = (state) => {
      if (state.currentTrack) {
        setCurrentTrack(state.currentTrack);
      } else {
        setCurrentTrack((prev) => (prev ? { ...prev, isPlaying: state.isPlaying } : null));
      }
      if (typeof state.progressMs === 'number') {
        setPlaybackProgress(state.progressMs);
      }
    };

    // Live Members Updated Event
    const handleMembersUpdated = ({ members: newMembers, joinedMember, leftMemberId }) => {
      setMembers(newMembers || []);
      if (joinedMember && joinedMember.userId !== user?._id) {
        toastInfo(`${joinedMember.name} joined the session!`, 'New Listener');
      }
    };

    // Live Chat / Reaction Event
    const handleChatMessage = (msg) => {
      setChatMessages((prev) => [...prev.slice(-49), msg]);
    };

    socket.on('queue-updated', handleQueueUpdated);
    socket.on('vote-updated', handleVoteUpdated);
    socket.on('track-changed', handleTrackChanged);
    socket.on('playback-state', handlePlaybackState);
    socket.on('members-updated', handleMembersUpdated);
    socket.on('chat-message', handleChatMessage);

    return () => {
      socket.off('queue-updated', handleQueueUpdated);
      socket.off('vote-updated', handleVoteUpdated);
      socket.off('track-changed', handleTrackChanged);
      socket.off('playback-state', handlePlaybackState);
      socket.off('members-updated', handleMembersUpdated);
      socket.off('chat-message', handleChatMessage);
      leaveSocketRoom(room.code, user?._id);
    };
  }, [room?.code, user, toastMusic, toastInfo]);

  // Load Room Data
  const loadRoom = async (code) => {
    if (!code) return null;
    setIsLoadingRoom(true);
    try {
      const data = await roomApi.getRoom(code);
      if (data.success && data.room) {
        setRoom(data.room);
        setQueue(data.room.queue || []);
        setCurrentTrack(data.room.currentTrack || null);
        setMembers(data.room.members || []);
        setHistory(data.room.history || []);
        setActiveDeviceId(data.room.activeDeviceId || null);
        setActiveDeviceName(data.room.activeDeviceName || null);
        return data.room;
      }
    } catch (err) {
      console.error('Failed to load room:', err);
      toastError(err.message, 'Room Error');
      throw err;
    } finally {
      setIsLoadingRoom(false);
    }
  };

  // Create Room
  const createRoom = async (name) => {
    try {
      const data = await roomApi.createRoom({ name });
      if (data.success && data.room) {
        setRoom(data.room);
        setQueue(data.room.queue || []);
        setCurrentTrack(data.room.currentTrack || null);
        setMembers(data.room.members || []);
        toastSuccess(`Session "${data.room.name}" created! Code: ${data.room.code}`);
        return data.room;
      }
    } catch (err) {
      toastError(err.message, 'Failed to create room');
      throw err;
    }
  };

  // Join Room by Code
  const joinRoom = async (code) => {
    try {
      const data = await roomApi.joinRoom(code);
      if (data.success && data.room) {
        setRoom(data.room);
        setQueue(data.room.queue || []);
        setCurrentTrack(data.room.currentTrack || null);
        setMembers(data.room.members || []);
        toastSuccess(`Joined session ${data.room.code}`);
        return data.room;
      }
    } catch (err) {
      toastError(err.message, 'Failed to join room');
      throw err;
    }
  };

  // Search Spotify Tracks (proxies Spotify API and integrates with current room queue)
  const searchTracks = useCallback(
    async (query) => {
      setSearchQuery(query);
      if (!query || !query.trim()) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const data = await searchApi.searchTracks(query, room?.code);
        if (data.success && data.tracks) {
          setSearchResults(data.tracks);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearchLoading(false);
      }
    },
    [room?.code]
  );

  // Add Song to Queue
  const addToQueue = async (track) => {
    if (!room?.code) return;
    try {
      const data = await queueApi.addToQueue(room.code, {
        spotifyTrackId: track.spotifyTrackId,
        name: track.name,
        artist: track.artist,
        albumArt: track.albumArt,
        albumName: track.albumName,
        durationMs: track.durationMs,
        uri: track.uri,
        previewUrl: track.previewUrl
      });

      if (data.success) {
        toastSuccess(`Added "${track.name}" to queue with your vote!`);

        // Update search results item state instantly
        setSearchResults((prev) =>
          prev.map((item) =>
            item.spotifyTrackId === track.spotifyTrackId
              ? {
                ...item,
                inQueue: true,
                userVoted: true,
                votesCount: (item.votesCount || 0) + 1
              }
              : item
          )
        );

        if (data.queue) setQueue(data.queue);
      }
    } catch (err) {
      toastError(err.message, 'Failed to add song');
    }
  };

  // Toggle Vote on Queued Track
  const toggleVote = async (trackIdOrSpotifyId) => {
    if (!room?.code) return;
    try {
      const data = await queueApi.toggleVote(room.code, trackIdOrSpotifyId);
      if (data.success) {
        if (data.userVoted) {
          toastSuccess('Upvoted song!', 'Vote Recorded');
        } else {
          toastInfo('Removed vote', 'Vote Updated');
        }

        // Update local search results state
        setSearchResults((prev) =>
          prev.map((item) =>
            item.spotifyTrackId === trackIdOrSpotifyId ||
              item.queueTrackId === trackIdOrSpotifyId
              ? {
                ...item,
                userVoted: data.userVoted,
                votesCount: data.voteCount
              }
              : item
          )
        );

        if (data.queue) setQueue(data.queue);
      }
    } catch (err) {
      toastError(err.message, 'Vote failed');
    }
  };

  // Remove track from queue
  const removeFromQueue = async (trackId) => {
    if (!room?.code) return;
    try {
      const data = await queueApi.removeFromQueue(room.code, trackId);
      if (data.success) {
        toastInfo('Song removed from queue');
        if (data.queue) setQueue(data.queue);
      }
    } catch (err) {
      toastError(err.message, 'Remove failed');
    }
  };

  // Host Player Controls
  const togglePlay = async () => {
    if (!room?.code) return;
    try {
      const data = await playerApi.togglePlay(room.code);
      if (data.success && data.currentTrack) {
        setCurrentTrack(data.currentTrack);
      }
    } catch (err) {
      toastError(err.message, 'Playback control failed');
    }
  };

  const skipTrack = async () => {
    if (!room?.code) return;
    try {
      const data = await playerApi.skipTrack(room.code);
      if (data.success) {
        toastInfo('Skipped to next song');
        if (data.currentTrack) setCurrentTrack(data.currentTrack);
        if (data.queue) setQueue(data.queue);
      }
    } catch (err) {
      toastError(err.message, 'Skip failed');
    }
  };

  const setPlaybackDevice = async (deviceId, deviceName) => {
    if (!room?.code) return;
    try {
      const data = await playerApi.setRoomDevice(room.code, deviceId, deviceName);
      if (data.success) {
        setActiveDeviceId(deviceId);
        setActiveDeviceName(deviceName);
        toastSuccess(`Connected to ${deviceName}`);
      }
    } catch (err) {
      toastError(err.message, 'Failed to set device');
    }
  };

  return (
    <RoomContext.Provider
      value={{
        room,
        queue,
        currentTrack,
        members,
        history,
        isHost,
        isLoadingRoom,
        playbackProgress,
        activeDeviceId,
        activeDeviceName,
        searchQuery,
        searchResults,
        searchLoading,
        chatMessages,
        loadRoom,
        createRoom,
        joinRoom,
        searchTracks,
        addToQueue,
        toggleVote,
        removeFromQueue,
        togglePlay,
        skipTrack,
        setPlaybackDevice
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) throw new Error('useRoom must be used within RoomProvider');
  return context;
};
