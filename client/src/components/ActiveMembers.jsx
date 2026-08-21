import React, { useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { useAuth } from '../context/AuthContext';
import { sendChatMessage } from '../services/socket';
import {
  Users,
  Crown,
  Send,
  MessageSquare,
  Sparkles,
  Radio
} from 'lucide-react';

const ActiveMembers = () => {
  const { user } = useAuth();
  const { room, members, chatMessages } = useRoom();
  const [chatInput, setChatInput] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !room?.code) return;
    sendChatMessage(
      room.code,
      chatInput.trim(),
      user || { name: 'Guest Listener' }
    );
    setChatInput('');
  };

  const isUserHost = (memberUserId) => {
    const hostId = room?.hostUserId?._id || room?.hostUserId;
    return hostId && memberUserId && hostId.toString() === memberUserId.toString();
  };

  return (
    <div className="w-full space-y-6">
      {/* Members Section */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyber-purple" />
            <h3 className="font-display font-bold text-sm sm:text-base text-white">
              Listeners in Room ({members.length || 1})
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Sync
          </span>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {members.map((member, i) => {
            const isHostMember = isUserHost(member.userId);
            const isMe = user && member.userId?.toString() === user._id.toString();

            return (
              <div
                key={member.userId || i}
                className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyber-purple/80 to-rose-600 flex items-center justify-center font-bold text-white shadow-sm">
                      {member.name?.charAt(0).toUpperCase()}
                    </div>
                    {member.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900" />
                    )}
                  </div>

                  <span className="font-medium text-slate-200 truncate">
                    {member.name} {isMe ? '(You)' : ''}
                  </span>
                </div>

                {isHostMember && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                    <Crown className="w-3 h-3 fill-current" /> Host
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Session Chat & Reactions */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 shadow-xl space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-rose-400" />
          <h3 className="font-display font-bold text-sm sm:text-base text-white">
            Session Chat
          </h3>
        </div>

        {/* Message Feed */}
        <div className="h-44 overflow-y-auto space-y-2 pr-1 flex flex-col justify-end bg-black/20 rounded-xl p-2.5 border border-white/5">
          {chatMessages.length === 0 ? (
            <p className="text-xs text-slate-500 text-center my-auto">
              No chat messages yet. Drop a reaction or track recommendation!
            </p>
          ) : (
            chatMessages.map((msg) => (
              <div key={msg.id} className="text-xs">
                <span className="font-bold text-rose-400">
                  {msg.user?.name}:{' '}
                </span>
                <span className="text-slate-200">{msg.text}</span>
              </div>
            ))
          )}
        </div>

        {/* Quick Emoji Reaction Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {['🔥 Fire', '👑 Peak', '⚡ Hype', '🙌 Next', '💯 Voted'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                if (room?.code) {
                  sendChatMessage(
                    room.code,
                    emoji,
                    user || { name: 'Guest Listener' }
                  );
                }
              }}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-slate-300 transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Message Input Form */}
        <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 py-2 px-3 rounded-xl glass-input text-xs placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="p-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold disabled:opacity-40 transition-all active:scale-95 shadow-md shadow-rose-500/20"
            title="Send Message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ActiveMembers;
