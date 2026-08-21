import { useState, useEffect, useRef, useCallback } from 'react';
import { authApi } from '../services/api';

export const useSpotifyWebPlayer = ({ isHost, spotifyConnected, onDeviceReady, onPlayerError }) => {
  const [player, setPlayer] = useState(null);
  const [webDeviceId, setWebDeviceId] = useState(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState(null);
  const [isPremium, setIsPremium] = useState(true);

  const playerRef = useRef(null);
  const isInitializingRef = useRef(false);

  // Function to fetch a fresh token directly from the backend
  const getFreshToken = useCallback(async () => {
    try {
      const data = await authApi.getSpotifyToken();
      if (data.success && data.accessToken) {
        setIsPremium(data.isPremium);
        return data.accessToken;
      }
      throw new Error(data.message || 'Failed to obtain Spotify token');
    } catch (err) {
      console.error('[Spotify Web Player] getFreshToken error:', err.message);
      throw err;
    }
  }, []);

  const initializePlayer = useCallback(() => {
    if (!window.Spotify || playerRef.current || isInitializingRef.current) return;
    if (!spotifyConnected) return;

    isInitializingRef.current = true;
    console.log('[Spotify Web Player] Initializing Web Playback SDK...');

    const newPlayer = new window.Spotify.Player({
      name: 'PassTheAux Web Player',
      getOAuthToken: async (cb) => {
        try {
          const freshToken = await getFreshToken();
          cb(freshToken);
        } catch (err) {
          console.error('[Spotify Web Player] getOAuthToken callback failed:', err.message);
        }
      },
      volume: 0.8
    });

    // Event: Player is ready and registered as an active Spotify Connect device
    newPlayer.addListener('ready', ({ device_id }) => {
      console.log('✅ [Spotify Web Player] Device is READY with ID:', device_id);
      setWebDeviceId(device_id);
      setIsPlayerReady(true);
      setPlayerError(null);

      if (onDeviceReady) {
        onDeviceReady(device_id, 'PassTheAux Web Player');
      }
    });

    // Event: Device has gone offline
    newPlayer.addListener('not_ready', ({ device_id }) => {
      console.warn('⚠️ [Spotify Web Player] Device ID has gone offline:', device_id);
      setIsPlayerReady(false);
    });

    // Error: Initialization error (e.g. browser doesn't support EME or DRM)
    newPlayer.addListener('initialization_error', ({ message }) => {
      console.error('❌ [Spotify Web Player] Initialization error:', message);
      const errObj = {
        type: 'INITIALIZATION_ERROR',
        message: `Browser Web Player initialization failed: ${message}`
      };
      setPlayerError(errObj);
      if (onPlayerError) onPlayerError(errObj);
    });

    // Error: Authentication token error / expired
    newPlayer.addListener('authentication_error', ({ message }) => {
      console.error('❌ [Spotify Web Player] Authentication error:', message);
      const errObj = {
        type: 'AUTH_ERROR',
        message: 'Spotify session expired or token unauthorized. Please reconnect Spotify.'
      };
      setPlayerError(errObj);
      if (onPlayerError) onPlayerError(errObj);
    });

    // Error: Account error (Spotify Free account attempting to use Web Playback SDK)
    newPlayer.addListener('account_error', ({ message }) => {
      console.error('❌ [Spotify Web Player] Account error (Spotify Premium Required):', message);
      setIsPremium(false);
      const errObj = {
        type: 'PREMIUM_REQUIRED',
        message: 'Playback control requires a Spotify Premium account. Free accounts can vote and search but cannot stream through Web Player.'
      };
      setPlayerError(errObj);
      if (onPlayerError) onPlayerError(errObj);
    });

    // Error: Playback error
    newPlayer.addListener('playback_error', ({ message }) => {
      console.error('❌ [Spotify Web Player] Playback error:', message);
      const errObj = {
        type: 'PLAYBACK_ERROR',
        message: `Playback error: ${message}`
      };
      setPlayerError(errObj);
      if (onPlayerError) onPlayerError(errObj);
    });

    // Connect to Spotify
    newPlayer.connect().then((success) => {
      if (success) {
        console.log('[Spotify Web Player] Successfully connected to Spotify audio server!');
      } else {
        console.warn('[Spotify Web Player] Connection call returned false');
      }
    });

    playerRef.current = newPlayer;
    setPlayer(newPlayer);
    isInitializingRef.current = false;
  }, [spotifyConnected, getFreshToken, onDeviceReady, onPlayerError]);

  useEffect(() => {
    if (!spotifyConnected) {
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
        setPlayer(null);
        setWebDeviceId(null);
        setIsPlayerReady(false);
      }
      return;
    }

    if (window.Spotify) {
      initializePlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = () => {
        initializePlayer();
      };
    }

    return () => {
      // Disconnect on unmount
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
        setPlayer(null);
        setWebDeviceId(null);
        setIsPlayerReady(false);
      }
    };
  }, [spotifyConnected, initializePlayer]);

  const reconnectPlayer = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.disconnect();
      playerRef.current = null;
    }
    isInitializingRef.current = false;
    initializePlayer();
  }, [initializePlayer]);

  return {
    player,
    webDeviceId,
    isPlayerReady,
    playerError,
    isPremium,
    reconnectPlayer
  };
};

export default useSpotifyWebPlayer;
