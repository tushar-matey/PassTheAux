import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '../context/ToastContext';
import { X, Copy, Check, Share2, Sparkles, Smartphone } from 'lucide-react';

const ShareRoomModal = ({ roomCode, roomName, onClose }) => {
  const { toastSuccess } = useToast();
  const [copied, setCopied] = useState(false);

  const roomUrl = `${window.location.origin}/room/${roomCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    toastSuccess('Room link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-7 border border-white/15 shadow-2xl space-y-6 relative bg-gradient-to-b from-cyber-card to-slate-900">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center space-y-1">
          <div className="inline-flex p-3 rounded-2xl bg-spotify-green/10 text-spotify-green mb-2 border border-spotify-green/20">
            <Share2 className="w-6 h-6" />
          </div>
          <h3 className="font-display font-black text-xl text-white">
            Invite to {roomName || 'Aux Session'}
          </h3>
          <p className="text-xs text-slate-400">
            Share this code or scan the QR code to join and start voting
          </p>
        </div>

        {/* Big Room Code Box */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-center space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Room Code
          </span>
          <div className="font-mono font-black text-3xl sm:text-4xl text-spotify-green tracking-widest select-all">
            {roomCode}
          </div>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="p-3 bg-white rounded-xl shadow-xl">
            <QRCodeSVG
              value={roomUrl}
              size={160}
              level="M"
              includeMargin={false}
            />
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5 text-cyber-purple" />
            Scan with phone camera to join instantly
          </span>
        </div>

        {/* Copy Link Button */}
        <button
          onClick={handleCopyLink}
          className="w-full py-3.5 px-4 rounded-2xl bg-spotify-green hover:bg-spotify-green-hover text-black font-bold text-sm shadow-lg shadow-spotify-green/25 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Invite Link</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ShareRoomModal;
