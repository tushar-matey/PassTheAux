import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';
import { useAuth } from '../context/AuthContext';
import NowPlayingBar from '../components/NowPlayingBar';
import SearchBar from '../components/SearchBar';
import QueueList from '../components/QueueList';
import ActiveMembers from '../components/ActiveMembers';
import {
  Search,
  ListMusic,
  Users,
  History,
  Radio,
  Loader2,
  AlertCircle,
  Sparkles,
  Music
} from 'lucide-react';

const RoomPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { room, loadRoom, isLoadingRoom, history } = useRoom();

  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'queue' | 'members' | 'history'

  useEffect(() => {
    if (code) {
      loadRoom(code).catch(() => {
        // Handled in context
      });
    }
  }, [code]);

  if (isLoadingRoom && !room) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-300">
          Entering Aux Session {code}...
        </p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="font-display font-black text-2xl text-white">
          Room Not Found
        </h2>
        <p className="text-sm text-slate-400 max-w-sm">
          The room code "{code}" does not exist or has expired. Check the code and try again.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm transition-all shadow-lg shadow-rose-500/20"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Now Playing Bar Hero (with Embedded YouTube Player) */}
      <NowPlayingBar />

      {/* Mobile Tab Navigation (visible on small screens) */}
      <div className="flex md:hidden items-center justify-between p-1 bg-cyber-card/80 border border-white/10 rounded-2xl">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'search'
              ? 'bg-rose-500 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search & Vote</span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'queue'
              ? 'bg-rose-500 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ListMusic className="w-3.5 h-3.5" />
          <span>Queue</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'members'
              ? 'bg-rose-500 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Listeners</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-rose-500 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>History</span>
        </button>
      </div>

      {/* Desktop Main Grid Layout (2-Column) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column (Search & Discovery) */}
        <div
          className={`md:col-span-7 space-y-6 ${
            activeTab !== 'search' && activeTab !== 'history' ? 'hidden md:block' : 'block'
          }`}
        >
          <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-black text-lg text-white">
                    YouTube Music Search
                  </h2>
                  <p className="text-xs text-slate-400">
                    Search any track or video to vote for queued songs or add new ones
                  </p>
                </div>
              </div>
            </div>

            {/* Search Input & Live Results */}
            <SearchBar />
          </div>

          {/* Recently Played History Section */}
          {history.length > 0 && (
            <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/10 shadow-xl space-y-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                <h3 className="font-display font-bold text-sm text-white">
                  Recently Played History ({history.length})
                </h3>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {history.map((t, i) => (
                  <div
                    key={t._id || i}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={
                          t.thumbnailUrl ||
                          `https://i.ytimg.com/vi/${t.youtubeVideoId}/hqdefault.jpg`
                        }
                        alt={t.title}
                        className="w-10 h-8 rounded-lg object-cover"
                      />
                      <div className="min-w-0">
                        <h5 className="font-semibold text-white truncate">
                          {t.title}
                        </h5>
                        <p className="text-[11px] text-slate-400 truncate">
                          {t.channelTitle || 'YouTube Music'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Played
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Ranked Collaborative Queue & Listeners) */}
        <div
          className={`md:col-span-5 space-y-6 ${
            activeTab !== 'queue' && activeTab !== 'members' ? 'hidden md:block' : 'block'
          }`}
        >
          {/* Live Collaborative Queue */}
          <div
            className={`glass-panel rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl space-y-4 ${
              activeTab === 'members' ? 'hidden md:block' : 'block'
            }`}
          >
            <QueueList />
          </div>

          {/* Active Listeners & Real-time Room Chat */}
          <div className={`${activeTab === 'queue' ? 'hidden md:block' : 'block'}`}>
            <ActiveMembers />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
