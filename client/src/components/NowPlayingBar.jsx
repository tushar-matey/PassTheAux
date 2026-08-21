import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRoom } from '../context/RoomContext';
import { useAuth } from '../context/AuthContext';
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Disc3,
  Sparkles,
  Radio,
  Tv,
  Eye,
  EyeOff,
  Maximize2,
  Music,
  Check,
  Loader2
} from 'lucide-react';

const formatTime = (totalSeconds) => {
  if (!totalSeconds || isNaN(totalSeconds)) return '0:00';
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const NowPlayingBar = () => {
  const { user } = useAuth();
  const {
    currentTrack,
    playbackProgress,
    isHost,
    togglePlay,
    skipTrack,
    notifyTrackEnded,
    broadcastPlaybackSync,
    broadcastSeek,
    remoteSyncEvent,
    remoteSeekEvent
  } = useRoom();

  const [playerReady, setPlayerReady] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  // Bug #2 fix: local progress state used for the seek bar display.
  // For the host it is polled from the YT player every 500ms.
  // For non-hosts it is synced from the context's socket-driven playbackProgress.
  const [localProgress, setLocalProgress] = useState(0);

  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const progressPollRef = useRef(null);
  const isHostRef = useRef(isHost);
  const currentTrackRef = useRef(currentTrack);
  // Refs for volume/mute so onPlayerReady closure always sees the latest values
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  // Bug D fix: prevent rapid play/pause clicks from firing multiple API calls
  const isTogglingRef = useRef(false);
  // Store callbacks in refs so the player useEffect closure always calls the
  // latest version WITHOUT needing them as deps (which would destroy/recreate
  // the YT player every time context re-renders — the root cause of the
  // loading↔play flicker loop when the first song is added).
  const notifyTrackEndedRef = useRef(notifyTrackEnded);
  const skipTrackRef = useRef(skipTrack);

  isHostRef.current = isHost;
  currentTrackRef.current = currentTrack;
  volumeRef.current = volume;
  isMutedRef.current = isMuted;
  notifyTrackEndedRef.current = notifyTrackEnded;
  skipTrackRef.current = skipTrack;

  // Non-host: keep localProgress in sync with socket-driven playbackProgress from context
  useEffect(() => {
    if (!isHost) {
      setLocalProgress(playbackProgress);
    }
  }, [isHost, playbackProgress]);

  // Host: Poll the YouTube IFrame player every 500ms for accurate, drift-free progress (Bug #2 fix)
  useEffect(() => {
    if (!isHost || !currentTrack?.youtubeVideoId) {
      if (progressPollRef.current) clearInterval(progressPollRef.current);
      return;
    }

    progressPollRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const t = playerRef.current.getCurrentTime();
          if (typeof t === 'number' && !isNaN(t)) {
            setLocalProgress(t);
          }
        } catch (e) {}
      }
    }, 500);

    return () => {
      if (progressPollRef.current) clearInterval(progressPollRef.current);
    };
  }, [isHost, currentTrack?.youtubeVideoId]);

  // Initialize YouTube Player — always DESTROY and RECREATE on track change (Bugs #4 & #5 fix).
  //
  // Why recreate instead of calling loadVideoById()?
  //   loadVideoById() does NOT re-bind event handlers. The onPlayerStateChange
  //   callback stays bound to the original player creation context, so track-ended
  //   notifications and playback triggers become stale. More critically, calling
  //   playVideo() right after loadVideoById() is a race — the video hasn't buffered
  //   yet and the call silently fails.
  //
  // By recreating we get:
  //   1. Fresh event handlers bound to the current track refs
  //   2. The CUED (state=5) event to safely trigger playVideo() after buffering
  useEffect(() => {
    const videoId = currentTrack?.youtubeVideoId;

    if (!videoId) {
      // No active track — destroy player if it exists
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
      }
      setLocalProgress(0);
      return;
    }

    const createPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        console.log('[YouTube Player] Waiting for window.YT...');
        return;
      }

      // Destroy existing player first to ensure fresh event handler bindings
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.warn('[YouTube Player] Error destroying previous player:', e.message);
        }
        playerRef.current = null;
      }

      setPlayerReady(false);
      setNeedsInteraction(false); // Reset on every new track

      // Helper: after calling playVideo(), check 1.5s later if the browser actually
      // started playback. If not (autoplay policy blocked it), show a tap-to-play prompt.
      const checkAutoplayBlocked = (playerTarget) => {
        setTimeout(() => {
          try {
            const state = playerTarget.getPlayerState();
            // 1 = PLAYING, 3 = BUFFERING — both mean autoplay worked
            if (state !== 1 && state !== 3) {
              console.log('[YouTube Player] Autoplay blocked by browser. Showing interaction prompt.');
              setNeedsInteraction(true);
            }
          } catch (e) {}
        }, 1500);
      };

      const onPlayerReady = (event) => {
        console.log('✅ [YouTube Player] Ready for video:', videoId);
        setPlayerReady(true);
        event.target.setVolume(isMutedRef.current ? 0 : volumeRef.current);

        const startSec = currentTrackRef.current?.progressSec || 0;
        if (startSec > 0) {
          event.target.seekTo(startSec, true);
        }

        // Only call playVideo() if the track should be playing.
        // For autoplay=1 this may already be in-progress, but calling it here
        // ensures it plays even if autoplay was blocked by the browser.
        if (currentTrackRef.current?.isPlaying) {
          event.target.playVideo();
          checkAutoplayBlocked(event.target);
        }
      };

      const onPlayerStateChange = (event) => {
        // YT.PlayerState values: -1 (UNSTARTED), 0 (ENDED), 1 (PLAYING),
        //                         2 (PAUSED), 3 (BUFFERING), 5 (CUED)
        const YT = window.YT;

        if (event.data === 1) {
          // Player started/resumed — dismiss any interaction prompt
          setNeedsInteraction(false);
        } else if (event.data === 0) {
          // Track finished — notify host so queue can advance
          console.log('[YouTube Player] Track ended. Notifying host advance...');
          if (isHostRef.current) {
            notifyTrackEndedRef.current(currentTrackRef.current?.youtubeVideoId);
          }
        } else if (event.data === YT.PlayerState.CUED) {
          // Bug #5 fix: Video is now fully cued and buffered — SAFE to call playVideo().
          // This is the correct place to trigger playback after a track change,
          // eliminating the race condition from calling playVideo() immediately after
          // loadVideoById() (which was the root cause of the silent no-play bug).
          if (currentTrackRef.current?.isPlaying) {
            console.log('[YouTube Player] Video CUED — starting playback for:', videoId);
            event.target.playVideo();
            checkAutoplayBlocked(event.target);
          }
        }
      };

      const onError = (event) => {
        console.warn('[YouTube Player] Error event:', event.data);
        // If video is unavailable/embed restricted, host can advance
        if (isHostRef.current && (event.data === 101 || event.data === 150 || event.data === 100)) {
          console.warn('[YouTube Player] Video restricted from embedding. Auto-skipping...');
          setTimeout(() => {
            skipTrackRef.current();
          }, 2000);
        }
      };

      try {
        console.log('[YouTube Player] Creating new player for video:', videoId);
        playerRef.current = new window.YT.Player('youtube-iframe-target', {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            autoplay: currentTrackRef.current?.isPlaying ? 1 : 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin
          },
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
            onError: onError
          }
        });
      } catch (err) {
        console.error('[YouTube Player] Initialization exception:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        createPlayer();
      };
    }

    // Note: no cleanup destroy here — the NEXT run of this effect will handle it
    // to avoid a race where the div is unmounted before the new player is attached.
    // Deps: ONLY youtubeVideoId — callbacks are accessed via refs so changes to
    // notifyTrackEnded/skipTrack never trigger a player destroy-recreate cycle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.youtubeVideoId]);

  // Host Periodic Sync Broadcast
  useEffect(() => {
    if (!isHost || !currentTrack?.youtubeVideoId) {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      return;
    }

    syncIntervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const currentTime = playerRef.current.getCurrentTime();
          const playerState = playerRef.current.getPlayerState();
          const isPlaying = playerState === 1; // 1 = YT.PlayerState.PLAYING

          broadcastPlaybackSync(
            currentTime,
            isPlaying,
            currentTrack.youtubeVideoId
          );
        } catch (e) {}
      }
    }, 6000);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [isHost, currentTrack?.youtubeVideoId, broadcastPlaybackSync]);

  // Non-Host Client Syncing with Host Events
  useEffect(() => {
    if (isHost || !playerRef.current || !remoteSyncEvent) return;

    try {
      const { progressSec, isPlaying, youtubeVideoId } = remoteSyncEvent;

      if (youtubeVideoId && currentTrack?.youtubeVideoId !== youtubeVideoId) {
        return; // Event for previous track
      }

      if (typeof playerRef.current.getCurrentTime === 'function') {
        const clientCurrentTime = playerRef.current.getCurrentTime() || 0;
        const drift = Math.abs(clientCurrentTime - progressSec);

        // If drift is greater than 3.5 seconds, resync seek position
        if (drift > 3.5) {
          console.log(`[YouTube Player Sync] Resyncing drift: ${drift.toFixed(1)}s`);
          playerRef.current.seekTo(progressSec, true);
        }

        if (isPlaying) {
          const state = playerRef.current.getPlayerState();
          if (state !== 1 && state !== 3) {
            playerRef.current.playVideo();
          }
        } else {
          playerRef.current.pauseVideo();
        }
      }
    } catch (e) {
      console.warn('[YouTube Player Sync] Error syncing:', e.message);
    }
  }, [isHost, remoteSyncEvent, currentTrack?.youtubeVideoId]);

  // Non-Host Seek Sync
  useEffect(() => {
    if (isHost || !playerRef.current || !remoteSeekEvent) return;
    try {
      if (typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(remoteSeekEvent.progressSec, true);
      }
    } catch (e) {}
  }, [isHost, remoteSeekEvent]);

  // Handle Play/Pause Toggle
  // Bug D fix: isTogglingRef prevents multiple in-flight API calls from rapid clicks.
  const handleToggle = () => {
    if (!isHost) {
      // Non-host: allow local play/resume if autoplay was suspended by browser
      if (playerRef.current) {
        try {
          const state = playerRef.current.getPlayerState();
          if (state === 1) {
            playerRef.current.pauseVideo();
          } else {
            playerRef.current.playVideo();
            setNeedsInteraction(false);
          }
        } catch (e) {}
      }
      return;
    }

    if (isTogglingRef.current) return;

    if (playerRef.current) {
      try {
        const state = playerRef.current.getPlayerState();
        if (state === 1) {
          playerRef.current.pauseVideo();
        } else {
          playerRef.current.playVideo();
        }
      } catch (e) {}
    }
    togglePlay();
  };

  // Handle Host Seeking on Progress Bar
  // Bug #3 fix: immediately update localProgress so the bar jumps visually
  // instead of waiting for the next 500ms poll tick.
  const handleSeek = (e) => {
    if (!isHost || !currentTrack?.durationSec) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSec = percent * currentTrack.durationSec;

    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(targetSec, true);
    }
    setLocalProgress(targetSec); // Immediate visual feedback (Bug #3 fix)
    broadcastSeek(targetSec);
  };

  // Handle Volume
  const handleVolumeChange = (e) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    setIsMuted(false);
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(newVol);
      playerRef.current.unMute();
    }
  };

  const handleMuteToggle = () => {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.unMute();
        playerRef.current.setVolume(volume);
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    }
  };

  const durationSec = currentTrack?.durationSec || 0;
  // Bug #2 fix: use localProgress for the seek bar — accurate for host (polled from YT
  // player) and up-to-date for non-hosts (synced via socket events via useEffect above).
  const progressPercent =
    durationSec > 0 ? Math.min(100, (localProgress / durationSec) * 100) : 0;

  if (!currentTrack || !currentTrack.title) {
    return (
      <div className="w-full glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl relative overflow-hidden bg-gradient-to-r from-cyber-card/90 via-cyber-card/60 to-cyber-card/90">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 shadow-inner">
              <Disc3 className="w-8 h-8 opacity-40" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h3 className="font-display font-bold text-lg text-white">
                  The Aux is Idle
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                  Waiting for tracks
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Search any song or music video on YouTube and vote to start the session!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-400">
              <Sparkles className="w-4 h-4 text-rose-500 animate-pulse" />
              <span>Highest-voted track plays next</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Main Glassmorphic Player Card */}
      <div className="w-full glass-panel rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl relative overflow-hidden bg-gradient-to-r from-cyber-card/95 via-slate-900/90 to-cyber-card/95">
        {/* Ambient Glow */}
        <div
          className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700 bg-rose-600"
        />
        <div
          className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700 bg-cyber-purple"
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Track Information & Album/Video Thumbnail */}
          <div className="flex items-center gap-4 w-full md:w-auto min-w-0">
            {/* Spinning Vinyl / Thumbnail Container */}
            <div className="relative flex-shrink-0 group">
              <img
                src={
                  currentTrack.thumbnailUrl ||
                  `https://i.ytimg.com/vi/${currentTrack.youtubeVideoId}/hqdefault.jpg`
                }
                alt={currentTrack.title}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-2xl border border-white/20 transition-all ${
                  currentTrack.isPlaying && playerReady ? 'shadow-rose-500/20' : 'grayscale-[20%]'
                }`}
              />

              {/* Bug B3 — Loading spinner while player initialises for a new track */}
              {!playerReady && currentTrack?.youtubeVideoId && (
                <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-rose-400 animate-spin" />
                </div>
              )}

              {/* Bug B1 — Browser autoplay blocked: show a tap-to-play prompt */}
              {needsInteraction && playerReady && (
                <button
                  onClick={() => {
                    try { playerRef.current?.playVideo(); } catch (e) {}
                    setNeedsInteraction(false);
                  }}
                  className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-black/70 transition-colors"
                  title="Click to start playback"
                >
                  <Play className="w-6 h-6 text-white fill-current" />
                  <span className="text-[10px] text-white/90 font-bold uppercase tracking-wider">Tap to Play</span>
                </button>
              )}

              {/* Animated Equalizer Wave Overlay when Playing */}
              {currentTrack.isPlaying && playerReady && !showVideo && !needsInteraction && (
                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center gap-0.5 pointer-events-none">
                  <div className="equalizer-bar" />
                  <div className="equalizer-bar" />
                  <div className="equalizer-bar" />
                  <div className="equalizer-bar" />
                </div>
              )}
            </div>

            {/* Title, Channel, Added By Pill */}
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                  Now Playing
                </span>
                {currentTrack.addedBy?.name && (
                  <span className="text-[11px] text-slate-400 font-medium truncate">
                    Picked by{' '}
                    <strong className="text-slate-200">
                      {currentTrack.addedBy.name}
                    </strong>
                  </span>
                )}
              </div>

              <h2 className="font-display font-black text-lg sm:text-xl text-white truncate tracking-tight mt-1">
                {currentTrack.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium truncate">
                {currentTrack.channelTitle || 'YouTube Music'}
              </p>
            </div>
          </div>

          {/* Center: Playback Controls & Progress Bar */}
          <div className="flex flex-col items-center gap-3 w-full md:max-w-md">
            {/* Controls */}
            <div className="flex items-center gap-4">
              {isHost ? (
                <>
                  <button
                    onClick={handleToggle}
                    disabled={!playerReady}
                    className={`w-12 h-12 rounded-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95 transition-all ${
                      !playerReady ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                    title={currentTrack.isPlaying ? 'Pause playback' : 'Resume playback'}
                  >
                    {!playerReady ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : currentTrack.isPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={skipTrack}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                    title="Skip to next top-voted track"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </>
              ) : (
                /* Non-host indicator */
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                  <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                  <span>Synced with Host's Player</span>
                </div>
              )}
            </div>

            {/* Interactive Progress Bar (Host can click to seek) */}
            <div className="w-full flex items-center gap-3">
              <span className="text-[11px] font-mono text-slate-400 w-10 text-right">
                {formatTime(localProgress)}
              </span>

              <div
                onClick={handleSeek}
                className={`relative flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5 ${
                  isHost ? 'cursor-pointer group' : ''
                }`}
                title={isHost ? 'Click to seek playback position' : ''}
              >
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-rose-500 via-red-500 to-amber-400 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <span className="text-[11px] font-mono text-slate-400 w-10">
                {formatTime(durationSec)}
              </span>
            </div>
          </div>

          {/* Right: Volume & Video Toggle Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {/* Toggle Video Display Button */}
            <button
              onClick={() => setShowVideo((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                showVideo
                  ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
              }`}
              title={showVideo ? 'Hide YouTube video player' : 'Show YouTube video player'}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>{showVideo ? 'Hide Video' : 'Watch Video'}</span>
            </button>

            {/* Volume Control */}
            <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-2.5 py-1.5">
              <button
                onClick={handleMuteToggle}
                className="text-slate-400 hover:text-white transition-colors"
                title={isMuted ? 'Unmute audio' : 'Mute audio'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                title="Volume"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Embedded YouTube IFrame Container (single persistent container) */}
      <div
        className={`transition-all duration-300 ${
          showVideo
            ? 'w-full h-[280px] sm:h-[400px] md:h-[460px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 block opacity-100'
            : 'w-[1px] h-[1px] opacity-0 pointer-events-none fixed -left-[9999px] -top-[9999px]'
        }`}
      >
        <div id="youtube-iframe-target" className="w-full h-full" />
      </div>
    </div>
  );
};

export default NowPlayingBar;
