import React, { useState, useRef } from 'react';
import { useRoom } from '../context/RoomContext';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  X,
  Plus,
  ThumbsUp,
  Music,
  Loader2,
  Sparkles,
  Flame,
  Tv,
  Check
} from 'lucide-react';

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const SearchBar = () => {
  const { isAuthenticated } = useAuth();
  const {
    searchResults,
    searchLoading,
    searchTracks,
    addToQueue,
    toggleVote,
    queue,
    currentTrack
  } = useRoom();

  const [inputVal, setInputVal] = useState('');
  const debounceTimerRef = useRef(null);

  // Debounced search trigger as user types
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputVal(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      searchTracks(val);
    }, 350);
  };

  const handleClear = () => {
    setInputVal('');
    searchTracks('');
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    searchTracks(inputVal);
  };

  return (
    <div className="w-full space-y-4">
      {/* Search Input Bar */}
      <form onSubmit={handleManualSearch} className="relative w-full">
        <div className="relative flex items-center">
          <div className="absolute left-4 text-slate-400 pointer-events-none">
            <Search className="w-5 h-5" />
          </div>

          <input
            type="text"
            value={inputVal}
            onChange={handleInputChange}
            placeholder="Search any song, artist, or music video on YouTube (e.g. 'Starboy', 'The Weeknd')..."
            className="w-full pl-12 pr-24 py-3.5 rounded-2xl glass-input text-sm md:text-base font-medium placeholder-slate-400 focus:ring-2 focus:ring-rose-500/50 transition-all shadow-lg"
          />

          <div className="absolute right-3 flex items-center gap-1.5">
            {inputVal && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              disabled={searchLoading || !inputVal.trim()}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-bold text-xs shadow-md shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
            >
              {searchLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'Search'
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Quick Search Hints / Badges */}
      {!inputVal && searchResults.length === 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 pt-1">
          <span className="flex items-center gap-1 font-semibold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" /> Popular searches:
          </span>
          {['Starboy', 'Blinding Lights', 'As It Was', 'Flowers', 'Cruel Summer', 'Levitating'].map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setInputVal(tag);
                searchTracks(tag);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 hover:text-white transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Loading Indicator */}
      {searchLoading && (
        <div className="py-8 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-7 h-7 text-rose-500 animate-spin" />
          <p className="text-xs font-medium">Searching YouTube catalog...</p>
        </div>
      )}

      {/* Search Results List */}
      {!searchLoading && searchResults.length > 0 && (
        <div className="space-y-2.5 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-rose-400" />
              Matching YouTube Tracks ({searchResults.length})
            </span>
            <span className="text-[11px] text-slate-400">
              Vote existing queue entries or add new tracks
            </span>
          </div>

          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {searchResults.map((track) => {
              // Check if track is currently in active queue
              const inQueueTrack = queue.find(
                (q) => q.youtubeVideoId === track.youtubeVideoId
              );
              const isInQueue = Boolean(inQueueTrack || track.inQueue);
              const voteCount = inQueueTrack
                ? inQueueTrack.votes?.length || 0
                : track.votesCount || 0;
              const hasVoted = inQueueTrack
                ? inQueueTrack.votes?.some(
                    (v) => (v.userId?._id || v.userId) === track.userId
                  )
                : track.userVoted;

              const isCurrent =
                currentTrack?.youtubeVideoId === track.youtubeVideoId;

              return (
                <div
                  key={track.youtubeVideoId}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    isInQueue
                      ? 'bg-rose-500/10 border-rose-500/30 shadow-md shadow-rose-500/5'
                      : 'glass-panel glass-panel-hover'
                  }`}
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative group/art flex-shrink-0">
                      <img
                        src={
                          track.thumbnailUrl ||
                          `https://i.ytimg.com/vi/${track.youtubeVideoId}/hqdefault.jpg`
                        }
                        alt={track.title}
                        className="w-14 h-11 sm:w-16 sm:h-12 rounded-xl object-cover border border-white/10 shadow-sm"
                      />
                    </div>

                    <div className="flex flex-col min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-semibold text-sm text-white truncate">
                          {track.title}
                        </h4>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500 text-white">
                            Playing
                          </span>
                        )}
                        {isInQueue && !isCurrent && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-0.5">
                            <Flame className="w-3 h-3 text-amber-400" /> In Queue
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {track.channelTitle || 'YouTube'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Duration & Dynamic Add/Vote Action Button */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                      {formatDuration(track.durationSec)}
                    </span>

                    {/* If already in queue -> Vote button; If not -> Add button */}
                    {isInQueue ? (
                      <button
                        onClick={() =>
                          toggleVote(inQueueTrack?._id || track.youtubeVideoId)
                        }
                        disabled={!isAuthenticated}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                          hasVoted
                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                            : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                        }`}
                        title={
                          hasVoted
                            ? 'Click to remove your vote'
                            : 'Click to upvote this queued track'
                        }
                      >
                        <ThumbsUp
                          className={`w-3.5 h-3.5 ${
                            hasVoted ? 'fill-current' : ''
                          }`}
                        />
                        <span>{hasVoted ? 'Voted' : 'Vote'}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                            hasVoted
                              ? 'bg-black/20 text-white'
                              : 'bg-white/20 text-slate-200'
                          }`}
                        >
                          {voteCount}
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => addToQueue(track)}
                        disabled={!isAuthenticated}
                        className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-bold text-xs shadow-md shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all"
                        title="Add track to shared queue"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
