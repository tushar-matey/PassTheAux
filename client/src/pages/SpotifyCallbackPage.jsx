import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const SpotifyCallbackPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthToken, refreshUser } = useAuth();
  const { toastSuccess, toastError } = useToast();

  const [status, setStatus] = useState('processing');
  const [errorMsg, setErrorMsg] = useState('');
  const hasProcessed = React.useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const error = params.get('error');
    const spotifyConnected = params.get('spotifyConnected');

    if (error) {
      setStatus('error');
      setErrorMsg(decodeURIComponent(error));
      toastError(decodeURIComponent(error), 'Spotify Auth Failed');
      setTimeout(() => navigate('/login'), 5000);
      return;
    }

    if (token) {
      setAuthToken(token);
      refreshUser().then(() => {
        setStatus('success');
        toastSuccess('Successfully connected to Spotify!');
        setTimeout(() => navigate('/'), 1000);
      });
    } else {
      setStatus('error');
      setErrorMsg('No token received from Spotify.');
      setTimeout(() => navigate('/login'), 4000);
    }
  }, [location, navigate, setAuthToken, refreshUser, toastSuccess, toastError]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm glass-panel rounded-3xl p-8 border border-white/10 text-center space-y-4 shadow-2xl">
        {status === 'processing' && (
          <>
            <Loader2 className="w-12 h-12 text-spotify-green animate-spin mx-auto" />
            <h3 className="font-display font-black text-xl text-white">
              Connecting Spotify...
            </h3>
            <p className="text-xs text-slate-400">
              Finalizing OAuth tokens and setting up your Aux permissions.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-spotify-green mx-auto" />
            <h3 className="font-display font-black text-xl text-white">
              Spotify Connected!
            </h3>
            <p className="text-xs text-slate-400">
              Redirecting you back to PassTheAux...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
            <h3 className="font-display font-black text-xl text-white">
              Authentication Error
            </h3>
            <p className="text-xs text-red-300">{errorMsg}</p>
            <p className="text-[11px] text-slate-500">
              Redirecting to login...
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default SpotifyCallbackPage;
