import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import { useToast } from '../context/ToastContext';
import {
  Radio,
  Share2,
  Copy,
  Check,
  Crown,
  Users,
  LogOut,
  LogIn,
  Music2,
  Sparkles,
  Laptop
} from 'lucide-react';
import ShareRoomModal from './ShareRoomModal';
import DeviceModal from './DeviceModal';

const Navbar = () => {
  const { user, isAuthenticated, logout, connectSpotify } = useAuth();
  const { room, members, isHost, activeDeviceName } = useRoom();
  const { toastSuccess } = useToast();
  const navigate = useNavigate();

  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);

  const handleCopyCode = () => {
    if (!room?.code) return;
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    toastSuccess(`Room code ${room.code} copied to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeOnlineCount = members.filter((m) => m.isOnline).length || (room ? 1 : 0);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-cyber-bg/85 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-spotify-green/50 rounded-lg p-1"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-spotify-green to-emerald-600 flex items-center justify-center shadow-lg shadow-spotify-green/20 group-hover:scale-105 transition-transform">
              <Radio className="w-5 h-5 text-black animate-pulse" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-black text-xl tracking-tight text-white group-hover:text-spotify-green transition-colors">
                  PassTheAux
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-spotify-green/20 text-spotify-green border border-spotify-green/30">
                  Live
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Collaborative Music Queue
              </span>
            </div>
          </Link>

          {/* Center: Room Code Banner (if in room) */}
          {room?.code && (
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-cyber-card/90 border border-white/10 rounded-xl p-1 shadow-inner">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-200 transition-all active:scale-95"
                  title="Click to copy room code"
                >
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Room:
                  </span>
                  <span className="font-mono font-bold text-sm text-spotify-green tracking-widest">
                    {room.code}
                  </span>
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-spotify-green" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                <button
                  onClick={() => setShowShareModal(true)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-1"
                  title="Share Room / QR Code"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Live Listeners Count Pill */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs font-medium text-slate-300">
                <Users className="w-3.5 h-3.5 text-cyber-purple" />
                <span>{activeOnlineCount} {activeOnlineCount === 1 ? 'listener' : 'listeners'}</span>
              </div>
            </div>
          )}

          {/* Right: Spotify Status, Host Info, User Menu */}
          <div className="flex items-center gap-3">
            {/* Spotify Host Connection Status */}
            {isAuthenticated && (
              <>
                {user.spotifyConnected ? (
                  <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-spotify-green/10 border border-spotify-green/30 text-xs font-medium text-spotify-green">
                    <span className="w-2 h-2 rounded-full bg-spotify-green animate-ping" />
                    <span>Spotify {user.hasSpotifyPremium ? 'Premium' : 'Connected'}</span>
                    {isHost && (
                      <button
                        onClick={() => setShowDeviceModal(true)}
                        className="ml-1 text-[11px] underline hover:text-white flex items-center gap-1"
                      >
                        <Laptop className="w-3 h-3" />
                        {activeDeviceName || 'Select Device'}
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={connectSpotify}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1DB954]/20 hover:bg-[#1DB954]/30 border border-[#1DB954]/40 text-xs font-semibold text-[#1DB954] transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Connect Spotify</span>
                  </button>
                )}
              </>
            )}

            {/* Auth Buttons / Profile */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyber-purple to-pink-500 flex items-center justify-center text-xs font-bold text-white shadow">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-white truncate max-w-[90px] sm:max-w-[120px]">
                      {user.name}
                    </span>
                    {isHost && (
                      <span className="text-[10px] text-amber-400 flex items-center gap-0.5 font-medium">
                        <Crown className="w-2.5 h-2.5" /> Host
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-spotify-green text-black hover:bg-spotify-green-hover shadow-lg shadow-spotify-green/20 transition-all active:scale-95"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
      {showShareModal && room?.code && (
        <ShareRoomModal roomCode={room.code} roomName={room.name} onClose={() => setShowShareModal(false)} />
      )}

      {showDeviceModal && isHost && (
        <DeviceModal onClose={() => setShowDeviceModal(false)} />
      )}
    </>
  );
};

export default Navbar;
