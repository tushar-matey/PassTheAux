import React from 'react';
import { useRoom } from '../context/RoomContext';
import { useAuth } from '../context/AuthContext';
import {
  ThumbsUp,
  Trash2,
  Crown,
  Flame,
  Music,
  Sparkles
} from 'lucide-react';

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const QueueList = () => {
  const { user, isAuthenticated } = useAuth();
  const { queue, isHost, toggleVote, removeFromQueue } = useRoom();

  const activeQueue = queue.filter((t) => !t.played);

  if (activeQueue.length === 0) {
    return (
      <div className="w-full glass-panel rounded-3xl p-8 border border-white/10 text-center flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 shadow-inner">
          <Music className="w-7 h-7 opacity-40 text-rose-500" />
        </div>
        <div>
          <h3 className="font-display font-bold text-base text-white">
            Queue is Empty
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Search for songs above to drop them into the aux queue. Everyone in the room can vote them to the top!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          <h3 className="font-display font-bold text-base text-white tracking-tight">
            Up Next ({activeQueue.length})
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">
          Ranked live by votes
        </span>
      </div>

      <div className="space-y-2">
        {activeQueue.map((track, index) => {
          const voteCount = track.votes?.length || 0;
          const hasVoted = user
            ? track.votes?.some(
                (v) => (v.userId?._id || v.userId) === user._id
              )
            : false;

          const isAdder = user && track.addedBy?.userId?.toString() === user._id.toString();
          const canDelete = isHost || isAdder;

          // Rank styling
          let rankBadge = (
            <span className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[11px] font-bold text-slate-400">
              #{index + 1}
            </span>
          );

          let borderStyle = 'glass-panel glass-panel-hover';

          if (index === 0) {
            rankBadge = (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-extrabold tracking-wider">
                <Crown className="w-3 h-3 fill-current" /> #1 NEXT
              </span>
            );
            borderStyle = 'bg-gradient-to-r from-amber-500/10 via-cyber-card to-cyber-card border-amber-500/30 shadow-lg shadow-amber-500/5';
          } else if (index === 1) {
            rankBadge = (
              <span className="px-2 py-0.5 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/40 text-[10px] font-bold">
                #2
              </span>
            );
          } else if (index === 2) {
            rankBadge = (
              <span className="px-2 py-0.5 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/40 text-[10px] font-bold">
                #3
              </span>
            );
          }

          return (
            <div
              key={track._id || track.youtubeVideoId}
              className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all ${borderStyle}`}
            >
              {/* Left: Rank, Thumbnail & Track Info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Rank Badge */}
                <div className="flex-shrink-0">{rankBadge}</div>

                {/* Thumbnail */}
                <img
                  src={
                    track.thumbnailUrl ||
                    `https://i.ytimg.com/vi/${track.youtubeVideoId}/hqdefault.jpg`
                  }
                  alt={track.title}
                  className="w-13 h-10 sm:w-14 sm:h-10 rounded-xl object-cover border border-white/10 flex-shrink-0 shadow-sm"
                />

                {/* Track Details */}
                <div className="flex flex-col min-w-0 flex-1 pr-2">
                  <h4 className="font-semibold text-sm text-white truncate tracking-tight">
                    {track.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                    <span className="truncate">{track.channelTitle || 'YouTube Music'}</span>
                    {track.addedBy?.name && (
                      <span className="hidden sm:inline text-[11px] text-slate-500 font-medium truncate">
                        • by {track.addedBy.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Duration, Delete Button & Interactive Vote Pill */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <span className="text-xs font-mono text-slate-400 hidden md:inline">
                  {formatDuration(track.durationSec)}
                </span>

                {/* Delete / Remove button (Host or Adder) */}
                {canDelete && (
                  <button
                    onClick={() => removeFromQueue(track._id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Vote Button */}
                <button
                  onClick={() => toggleVote(track._id)}
                  disabled={!isAuthenticated}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                    hasVoted
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 hover:bg-rose-400'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                  }`}
                  title={
                    hasVoted
                      ? 'Click to remove your vote'
                      : 'Click to upvote this track'
                  }
                >
                  <ThumbsUp
                    className={`w-3.5 h-3.5 ${hasVoted ? 'fill-current' : ''}`}
                  />
                  <span>{hasVoted ? 'Voted' : 'Vote'}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      hasVoted
                        ? 'bg-black/20 text-white font-extrabold'
                        : 'bg-white/20 text-slate-200'
                    }`}
                  >
                    {voteCount}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QueueList;
