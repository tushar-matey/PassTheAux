import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Music, Radio } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    ({ title, message, type = 'info', duration = 4000, icon = null }) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newToast = { id, title, message, type, icon };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const toastSuccess = useCallback(
    (message, title = 'Success') => {
      return addToast({ title, message, type: 'success' });
    },
    [addToast]
  );

  const toastError = useCallback(
    (message, title = 'Error') => {
      return addToast({ title, message, type: 'error' });
    },
    [addToast]
  );

  const toastInfo = useCallback(
    (message, title = 'Info') => {
      return addToast({ title, message, type: 'info' });
    },
    [addToast]
  );

  const toastMusic = useCallback(
    (message, title = 'Now Playing') => {
      return addToast({ title, message, type: 'music' });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{ addToast, removeToast, toastSuccess, toastError, toastInfo, toastMusic }}
    >
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let bg = 'bg-slate-900/90 border-slate-700 text-slate-100';
          let IconComponent = Info;
          let iconColor = 'text-blue-400';

          if (toast.type === 'success') {
            bg = 'bg-slate-900/95 border-rose-500/40 text-slate-100';
            IconComponent = CheckCircle2;
            iconColor = 'text-rose-400';
          } else if (toast.type === 'error') {
            bg = 'bg-red-950/90 border-red-500/40 text-red-100';
            IconComponent = AlertCircle;
            iconColor = 'text-red-400';
          } else if (toast.type === 'music') {
            bg = 'bg-purple-950/90 border-cyber-purple/40 text-purple-100';
            IconComponent = Music;
            iconColor = 'text-cyber-purple';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-5 ${bg}`}
            >
              <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h4 className="text-sm font-semibold tracking-wide text-white mb-0.5">
                    {toast.title}
                  </h4>
                )}
                <p className="text-xs text-slate-300 leading-relaxed break-words">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white transition-colors flex-shrink-0 p-1"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
