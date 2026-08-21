import React, { useState, useRef, useEffect } from 'react';
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
  Laptop,
  Music,
  Heart
} from 'lucide-react';
import DeviceModal from './DeviceModal';

const formatTime = (ms) => {
  if (!ms || isNaN(ms)) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const NowPlayingBar = () => {
  const { user } = useAuth();
  const {
    currentTrack,
    playbackProgress,
    isHost,
    togglePlay,
    skipTrack,
    activeDeviceName,
    isWebPlayerReady,
    isPremium
  } = useRoom();

  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [localAudioPlaying, setLocalAudioPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  // Synchronize audio preview if available
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleAudioToggle = () => {
    if (!audioRef.current || !currentTrack?.previewUrl) return;
    if (localAudioPlaying) {
      audioRef.current.pause();
      setLocalAudioPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setLocalAudioPlaying(true);
      }).catch((e) => console.warn('Audio preview play prevented:', e));
    }
  };

  const progressPercent =
    currentTrack?.durationMs && currentTrack.durationMs > 0
      ? Math.min(100, (playbackProgress / currentTrack.durationMs) * 100)
      : 0;

  if (!currentTrack || !currentTrack.name) {
    return (
      <div className="w-full glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl relative overflow-hidden bg-gradient-to-r from-cyber-card/90 via-cyber-card/60 to-cyber-card/90">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 shadow-inner">
              <Disc3 className="w-8 h-8 opacity-40" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-lg text-white">
                  The Aux is Idle
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                  Waiting for songs
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Search for any track above and vote to start the session!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-400">
              <Sparkles className="w-4 h-4 text-spotify-green animate-pulse" />
              <span>Highest-voted song plays next</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full glass-panel rounded-2xl p-5 sm:p-6 border border-white/10 shadow-2xl relative overflow-hidden bg-gradient-to-r from-cyber-card/95 via-slate-900/90 to-cyber-card/95">
        {/* Ambient Glow in Background */}
        <div
          className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
          style={{ backgroundColor: '#1DB954' }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
          style={{ backgroundColor: '#8B5CF6' }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Track Information & Album Art */}
          <div className="flex items-center gap-4 w-full md:w-auto min-w-0">
            {/* Spinning Vinyl / Album Art Container */}
            <div className="relative flex-shrink-0 group">
              <img
                src={
                  currentTrack.albumArt ||
                  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80'
                }
                alt={currentTrack.name}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shadow-2xl border border-white/20 transition-all ${
                  currentTrack.isPlaying ? 'shadow-spotify-green/20' : 'grayscale-[20%]'
                }`}
              />

              {/* Animated Equalizer Wave Overlay */}
              {currentTrack.isPlaying && (
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center gap-0.5">
                  <div className="equalizer-bar" />
                  <div className="equalizer-bar" />
                  <div className="equalizer-bar" />
                  <div className="equalizer-bar" />
                </div>
              )}
            </div>

            {/* Title, Artist, Added By Pill */}
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-spotify-green/20 text-spotify-green border border-spotify-green/40">
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
                {currentTrack.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium truncate">
                {currentTrack.artist}
              </p>
            </div>
          </div>

          {/* Center: Playback Controls & Progress Bar */}
          <div className="flex flex-col items-center gap-3 w-full md:max-w-md">
            {/* Host Controls */}
            <div className="flex items-center gap-4">
              {isHost ? (
                <>
                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black flex items-center justify-center shadow-lg shadow-spotify-green/30 hover:scale-105 active:scale-95 transition-all"
                    title={currentTrack.isPlaying ? 'Pause playback' : 'Resume playback'}
                  >
                    {currentTrack.isPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={skipTrack}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                    title="Skip to next top-voted song"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </>
              ) : (
                /* Non-host indicator */
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                  <Radio className="w-3.5 h-3.5 text-spotify-green animate-pulse" />
                  <span>Synced with Host's Spotify</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full flex items-center gap-3">
              <span className="text-[11px] font-mono text-slate-400 w-10 text-right">
                {formatTime(playbackProgress)}
              </span>

              <div className="relative flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-spotify-green to-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <span className="text-[11px] font-mono text-slate-400 w-10">
                {formatTime(currentTrack.durationMs)}
              </span>
            </div>
          </div>

          {/* Right: Device / Preview / Aux Info */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {/* Audio Preview element if track has previewUrl */}
            {currentTrack.previewUrl && (
              <>
                <audio
                  ref={audioRef}
                  src={currentTrack.previewUrl}
                  onEnded={() => setLocalAudioPlaying(false)}
                />
                <button
                  onClick={handleAudioToggle}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    localAudioPlaying
                      ? 'bg-spotify-green text-black border-spotify-green shadow-lg shadow-spotify-green/20'
                      : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
                  }`}
                  title="Listen to 30-sec preview clip in browser"
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>{localAudioPlaying ? 'Preview Playing' : 'Preview Audio'}</span>
                </button>
              </>
            )}

            {/* Host Device Selector Modal Button */}
            {isHost && (
              <button
                onClick={() => setShowDeviceModal(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  isWebPlayerReady
                    ? 'bg-spotify-green/10 border-spotify-green/30 text-spotify-green hover:bg-spotify-green/20'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                }`}
                title="Change Spotify Playback Device"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {activeDeviceName || (isWebPlayerReady ? 'Web Player' : 'Select Device')}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Premium notice for Free Host accounts */}
        {isHost && !isPremium && (
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2 text-xs text-amber-300/90">
            <span className="flex items-center gap-1.5 font-medium">
              <span>⚠️ Spotify Free Host: Full streaming playback requires a Spotify Premium account.</span>
            </span>
            <button
              onClick={() => setShowDeviceModal(true)}
              className="text-spotify-green underline hover:text-spotify-green-hover text-[11px]"
            >
              Device details
            </button>
          </div>
        )}
      </div>

      {showDeviceModal && <DeviceModal onClose={() => setShowDeviceModal(false)} />}
    </>
  );
};

export default NowPlayingBar;
