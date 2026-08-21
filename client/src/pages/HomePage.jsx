import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import { useToast } from '../context/ToastContext';
import {
  Radio,
  Plus,
  LogIn,
  Sparkles,
  ArrowRight,
  Disc3,
  ThumbsUp,
  Search,
  Music2,
  Users,
  ShieldCheck,
  Flame
} from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, connectSpotify } = useAuth();
  const { createRoom, joinRoom } = useRoom();
  const { toastError } = useToast();

  const [joinCode, setJoinCode] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login?redirect=create');
      return;
    }
    setIsCreating(true);
    try {
      const room = await createRoom(sessionName.trim() || `${user.name}'s Aux Session`);
      navigate(`/room/${room.code}`);
    } catch (err) {
      // toastError handled in RoomContext
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setIsJoining(true);
    try {
      const room = await joinRoom(joinCode.trim().toUpperCase());
      navigate(`/room/${room.code}`);
    } catch (err) {
      // handled
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-3xl mx-auto pt-4 sm:pt-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-spotify-green/10 border border-spotify-green/30 text-spotify-green text-xs font-bold uppercase tracking-wider shadow-lg shadow-spotify-green/10">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real-time Collaborative Music Democracy</span>
        </div>

        <h1 className="font-display font-black text-4xl sm:text-6xl md:text-7xl tracking-tight text-white leading-tight">
          Who gets the Aux?{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-spotify-green via-emerald-400 to-cyan-400">
            Everyone.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto">
          Start a room, search any song on Spotify, and vote in real-time. The most voted tracks climb to the top and play next on the host's sound system.
        </p>
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
        {/* Create Room Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-between group hover:border-spotify-green/40 transition-all duration-300">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-spotify-green to-emerald-600 flex items-center justify-center text-black font-bold shadow-lg shadow-spotify-green/20 group-hover:scale-105 transition-transform">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>

            <div>
              <h2 className="font-display font-black text-2xl text-white">
                Start an Aux Session
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Be the room host, connect your Spotify, and invite your friends or party crowd to queue & vote.
              </p>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3 pt-2">
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Session Name (e.g. Friday Night Chill)"
                className="w-full px-4 py-3 rounded-xl glass-input text-sm placeholder-slate-500"
              />

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-3.5 px-6 rounded-xl bg-spotify-green hover:bg-spotify-green-hover text-black font-extrabold text-sm shadow-xl shadow-spotify-green/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>{isCreating ? 'Creating Room...' : 'Create Room as Host'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Spotify Premium required for host playback</span>
            {isAuthenticated && !user?.spotifyConnected && (
              <button
                onClick={connectSpotify}
                className="text-spotify-green hover:underline font-semibold"
              >
                Connect Spotify →
              </button>
            )}
          </div>
        </div>

        {/* Join Room Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-between group hover:border-cyber-purple/40 transition-all duration-300">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyber-purple to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-cyber-purple/20 group-hover:scale-105 transition-transform">
              <Radio className="w-6 h-6" />
            </div>

            <div>
              <h2 className="font-display font-black text-2xl text-white">
                Join with Room Code
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Have a 6-character room code? Enter it below to join the shared room, vote for tracks, and add songs.
              </p>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-3 pt-2">
              <input
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ENTER 6-CHAR CODE (e.g. AUX882)"
                className="w-full px-4 py-3 rounded-xl glass-input text-center text-lg font-mono font-black tracking-widest uppercase placeholder-slate-500"
              />

              <button
                type="submit"
                disabled={isJoining || !joinCode.trim()}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyber-purple to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-cyber-purple/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <span>{isJoining ? 'Joining Room...' : 'Enter Session'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>No Spotify account needed for guest listeners</span>
            <span className="text-slate-300 font-mono">100% Real-time sync</span>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto w-full pt-6">
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-spotify-green/10 text-spotify-green flex items-center justify-center">
            <Search className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-white">
            1. Search Any Spotify Track
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Directly search Spotify's entire global library by song name, artist, or album.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Flame className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-white">
            2. Real-time Democratic Voting
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Vote for songs already queued or add fresh hits. Top-voted songs rise instantly to #1.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-cyber-purple/10 text-cyber-purple flex items-center justify-center">
            <Disc3 className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-white">
            3. Auto Play on Host Spotify
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            When a track ends, the top-ranked song plays seamlessly through the host's connected Spotify player.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
