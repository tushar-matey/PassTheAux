import React, { useState, useEffect } from 'react';
import { useRoom } from '../context/RoomContext';
import { playerApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Laptop,
  Smartphone,
  Speaker,
  X,
  Check,
  RefreshCw,
  AlertCircle,
  Radio,
  Sparkles
} from 'lucide-react';

const DeviceModal = ({ onClose }) => {
  const { room, activeDeviceId, setPlaybackDevice } = useRoom();
  const { toastError, toastSuccess } = useToast();

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const data = await playerApi.getHostDevices();
      if (data.success && data.devices) {
        setDevices(data.devices);
      }
    } catch (err) {
      console.error('Failed to fetch Spotify devices:', err);
      toastError(err.message, 'Spotify Device Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleSelectDevice = async (device) => {
    try {
      await setPlaybackDevice(device.id, device.name);
      onClose();
    } catch (err) {
      toastError('Could not set playback device', 'Device Error');
    }
  };

  const getDeviceIcon = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('phone')) return Smartphone;
    if (t.includes('speaker') || t.includes('audio')) return Speaker;
    return Laptop;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-white/15 shadow-2xl space-y-5 relative bg-gradient-to-b from-cyber-card to-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-spotify-green/10 text-spotify-green border border-spotify-green/20">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-white">
                Spotify Playback Device
              </h3>
              <p className="text-xs text-slate-400">
                Choose which Spotify device plays the room music
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-spotify-green" />
              <span className="text-xs">Scanning active Spotify devices...</span>
            </div>
          ) : devices.length === 0 ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertCircle className="w-4 h-4" />
                <span>No active Spotify devices detected</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Open Spotify on your phone, computer, or web player and start playing any track once so Spotify activates your device.
              </p>
            </div>
          ) : (
            devices.map((device) => {
              const Icon = getDeviceIcon(device.type);
              const isSelected = activeDeviceId === device.id || device.is_active;

              return (
                <button
                  key={device.id}
                  onClick={() => handleSelectDevice(device)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
                    isSelected
                      ? 'bg-spotify-green/15 border-spotify-green/40 shadow-lg shadow-spotify-green/5'
                      : 'bg-white/5 hover:bg-white/10 border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl ${
                        isSelected
                          ? 'bg-spotify-green text-black'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">
                        {device.name}
                      </h4>
                      <p className="text-xs text-slate-400 capitalize">
                        {device.type} {device.is_active ? '• Active' : ''}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-spotify-green/20 text-spotify-green text-[11px] font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Selected</span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchDevices}
          className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Device List</span>
        </button>
      </div>
    </div>
  );
};

export default DeviceModal;
