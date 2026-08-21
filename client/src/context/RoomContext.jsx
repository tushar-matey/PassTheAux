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

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // UI / Loading states
  const [isLoadingRoom, setIsLoadingRoom] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // Incoming sync state from host for non-host player synchronization
  const [remoteSyncEvent, setRemoteSyncEvent] = useState(null);
  const [remoteSeekEvent, setRemoteSeekEvent] = useState(null);

  // Chat / Live feed
  const [chatMessages, setChatMessages] = useState([]);

  const isHost = Boolean(
    room &&
    user &&
    (room.hostUserId?._id === user._id || room.hostUserId === user._id)
  );

  // Ref used by the progress timer to apply playback-sync corrections for
  // non-host clients without triggering re-renders (Bug E fix).
  const syncCorrectionRef = useRef(null);
  // Ref that holds the latest currentTrack so the interval closure can read
  // fresh values without re-creating the interval on every field change.
  const currentTrackTimerRef = useRef(currentTrack);
  // Guard ref: prevent rapid play/pause clicks from racing the server (Bug D fix).
  const isTogglingPlayRef = useRef(false);

  currentTrackTimerRef.current = currentTrack;

  // Progress timer for local UI bar.
  // Deps narrowed to youtubeVideoId + isPlaying so that startedAt corrections
  // (written into syncCorrectionRef by handlePlaybackSync) don't restart the
  // interval and cause unnecessary re-renders (Bug E fix).
  useEffect(() => {
    let interval = null;

    if (currentTrack && currentTrack.isPlaying && currentTrack.durationSec > 0) {
      interval = setInterval(() => {
        const track = currentTrackTimerRef.current;
        if (!track) return;
        // Non-hosts: prefer the sync-corrected startedAt to stay accurate
        // between the 6-second socket sync windows.
        const effectiveStartedAt =
          syncCorrectionRef.current?.startedAt || track.startedAt;
        if (!effectiveStartedAt) return;
        const elapsedSec = (Date.now() - new Date(effectiveStartedAt).getTime()) / 1000;
        const clamped = Math.min(elapsedSec, track.durationSec);
        setPlaybackProgress(clamped);
      }, 500);
    } else if (currentTrack && !currentTrack.isPlaying) {
      setPlaybackProgress(currentTrack.progressSec || 0);
    } else {
      setPlaybackProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.youtubeVideoId, currentTrack?.isPlaying]);

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
            (q) => q.youtubeVideoId === item.youtubeVideoId
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
      // Reset sync correction when the track changes — the previous track's
      // corrected startedAt must not bleed into the new track's timer.
      syncCorrectionRef.current = null;
      if (newQueue) setQueue(newQueue);

      if (newTrack?.title) {
        toastMusic(`Now Playing: ${newTrack.title}`);
        // Celebratory confetti for the newly promoted track
        try {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.85 }
          });
        } catch (e) {}
      }
    };

    // Live Playback State Event (play/pause/progress)
    const handlePlaybackState = (state) => {
      if (state.currentTrack) {
        setCurrentTrack(state.currentTrack);
      } else {
        setCurrentTrack((prev) => (prev ? { ...prev, isPlaying: state.isPlaying } : null));
      }
      if (typeof state.progressSec === 'number') {
        setPlaybackProgress(state.progressSec);
      }
    };

    // Live Playback Sync Event (from Host player)
    const handlePlaybackSync = (syncData) => {
      setRemoteSyncEvent(syncData);
      if (typeof syncData.progressSec === 'number') {
        setPlaybackProgress(syncData.progressSec);
        // Bug E fix: store the corrected startedAt in a ref instead of calling
        // setCurrentTrack(), which was triggering a full re-render every 6 seconds.
        // The progress timer interval reads from syncCorrectionRef.current directly.
        if (syncData.isPlaying) {
          syncCorrectionRef.current = {
            startedAt: new Date(Date.now() - syncData.progressSec * 1000)
          };
        }
      }
    };

    // Live Seek Event (from Host player)
    const handleSeekPlayback = (seekData) => {
      setRemoteSeekEvent(seekData);
      if (typeof seekData.progressSec === 'number') {
        setPlaybackProgress(seekData.progressSec);
      }
    };

    // Live Members Updated Event
    const handleMembersUpdated = ({ members: newMembers, joinedMember }) => {
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
    socket.on('playback-sync', handlePlaybackSync);
    socket.on('seek-playback', handleSeekPlayback);
    socket.on('members-updated', handleMembersUpdated);
    socket.on('chat-message', handleChatMessage);

    return () => {
      socket.off('queue-updated', handleQueueUpdated);
      socket.off('vote-updated', handleVoteUpdated);
      socket.off('track-changed', handleTrackChanged);
      socket.off('playback-state', handlePlaybackState);
      socket.off('playback-sync', handlePlaybackSync);
      socket.off('seek-playback', handleSeekPlayback);
      socket.off('members-updated', handleMembersUpdated);
      socket.off('chat-message', handleChatMessage);
      leaveSocketRoom(room.code, user?._id);
    };
  }, [room?.code, user, toastMusic, toastInfo]);

  // Host notifies server when current YouTube video ends
  const notifyTrackEnded = useCallback(
    (youtubeVideoId) => {
      if (!room?.code || !isHost) return;
      const socket = getSocket();
      console.log('[RoomContext] Emitting track-ended for video:', youtubeVideoId);
      socket.emit('track-ended', { roomCode: room.code, youtubeVideoId });
    },
    [room?.code, isHost]
  );

  // Host broadcasts playback sync periodically
  const broadcastPlaybackSync = useCallback(
    (progressSec, isPlaying, youtubeVideoId) => {
      if (!room?.code || !isHost) return;
      const socket = getSocket();
      socket.emit('playback-sync', {
        roomCode: room.code,
        progressSec,
        isPlaying,
        youtubeVideoId
      });
    },
    [room?.code, isHost]
  );

  // Host broadcasts seek position
  const broadcastSeek = useCallback(
    (progressSec) => {
      if (!room?.code || !isHost) return;
      const socket = getSocket();
      socket.emit('seek-playback', {
        roomCode: room.code,
        progressSec
      });
    },
    [room?.code, isHost]
  );

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

  // Search YouTube Tracks
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
        youtubeVideoId: track.youtubeVideoId,
        title: track.title,
        channelTitle: track.channelTitle,
        thumbnailUrl: track.thumbnailUrl,
        durationSec: track.durationSec
      });

      if (data.success) {
        toastSuccess(`Added "${track.title}" to queue with your vote!`);

        // Update search results item state instantly
        setSearchResults((prev) =>
          prev.map((item) =>
            item.youtubeVideoId === track.youtubeVideoId
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
  const toggleVote = async (trackIdOrYoutubeId) => {
    if (!room?.code) return;
    try {
      const data = await queueApi.toggleVote(room.code, trackIdOrYoutubeId);
      if (data.success) {
        if (data.userVoted) {
          toastSuccess('Upvoted track!', 'Vote Recorded');
        } else {
          toastInfo('Removed vote', 'Vote Updated');
        }

        // Update local search results state
        setSearchResults((prev) =>
          prev.map((item) =>
            item.youtubeVideoId === trackIdOrYoutubeId ||
            item.queueTrackId === trackIdOrYoutubeId
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
    // Bug D fix: debounce guard to prevent rapid successive clicks from racing
    // the server and leaving isPlaying in an undefined/flipped state.
    if (isTogglingPlayRef.current) return;
    isTogglingPlayRef.current = true;
    try {
      const data = await playerApi.togglePlay(room.code);
      if (data.success && data.currentTrack) {
        setCurrentTrack(data.currentTrack);
      }
    } catch (err) {
      toastError(err.message, 'Playback control failed');
    } finally {
      // Allow the next toggle after the server has responded
      isTogglingPlayRef.current = false;
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
        remoteSyncEvent,
        remoteSeekEvent,
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
        notifyTrackEnded,
        broadcastPlaybackSync,
        broadcastSeek
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
