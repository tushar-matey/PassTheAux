import axios from 'axios';
import User from '../models/User.js';

class SpotifyService {
  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
    this.redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5000/api/auth/spotify/callback';

    // Cached app-level client credentials token for general search
    this.appAccessToken = null;
    this.appTokenExpiresAt = null;

    // Spotify Scopes required for playback control and profile
    this.scopes = [
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'user-read-email',
      'user-read-private',
      'streaming'
    ];

    // Rich fallback catalog for testing/demo when keys are not yet configured
    this.mockTracks = [
      {
        spotifyTrackId: '4cOdK2wGLETKBW3PvgPWqT',
        name: 'Starboy',
        artist: 'The Weeknd, Daft Punk',
        albumName: 'Starboy',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452',
        durationMs: 230453,
        uri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
        previewUrl: 'https://p.scdn.co/mp3-preview/a96ec7f864cfbcf76a80d5006b539c29bf33fbcf'
      },
      {
        spotifyTrackId: '0VjIjW4GlUZAMYd2vXMi3b',
        name: 'Blinding Lights',
        artist: 'The Weeknd',
        albumName: 'After Hours',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
        durationMs: 200040,
        uri: 'spotify:track:0VjIjW4GlUZAMYd2vXMi3b',
        previewUrl: 'https://p.scdn.co/mp3-preview/e41e8c7512211603d7b8a7fbc265e318dfb20109'
      },
      {
        spotifyTrackId: '7qiZfU4dY1lWllzX7mPBI3',
        name: 'Shape of You',
        artist: 'Ed Sheeran',
        albumName: '÷ (Divide)',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96',
        durationMs: 233712,
        uri: 'spotify:track:7qiZfU4dY1lWllzX7mPBI3',
        previewUrl: 'https://p.scdn.co/mp3-preview/8b628582f71f4b677a0129f48d087f4b391789c8'
      },
      {
        spotifyTrackId: '2b8vdOwxj2r4zRj1A64Y06',
        name: 'As It Was',
        artist: 'Harry Styles',
        albumName: "Harry's House",
        albumArt: 'https://i.scdn.co/image/ab67616d0000b2732e8f6fb74623f3775a00464d',
        durationMs: 167303,
        uri: 'spotify:track:2b8vdOwxj2r4zRj1A64Y06',
        previewUrl: null
      },
      {
        spotifyTrackId: '1BxfuPKGuaTgP7aM0XbdMe',
        name: 'Levitating',
        artist: 'Dua Lipa',
        albumName: 'Future Nostalgia',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b273bd26ede1ae69327010d49946',
        durationMs: 203064,
        uri: 'spotify:track:1BxfuPKGuaTgP7aM0XbdMe',
        previewUrl: null
      },
      {
        spotifyTrackId: '59nOXPma03VqxuEia43gWm',
        name: 'Flowers',
        artist: 'Miley Cyrus',
        albumName: 'Endless Summer Vacation',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b273f429549123dbe8552764ba1d',
        durationMs: 200442,
        uri: 'spotify:track:59nOXPma03VqxuEia43gWm',
        previewUrl: null
      },
      {
        spotifyTrackId: '3GZD6HmiNUIRXYoe7Gww1B',
        name: 'Cruel Summer',
        artist: 'Taylor Swift',
        albumName: 'Lover',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b273e787cffec20aa2a396a61647',
        durationMs: 178277,
        uri: 'spotify:track:3GZD6HmiNUIRXYoe7Gww1B',
        previewUrl: null
      },
      {
        spotifyTrackId: '7K393v2v71W03V6w09J33b',
        name: 'Sunflower',
        artist: 'Post Malone, Swae Lee',
        albumName: 'Spider-Man: Into the Spider-Verse',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b273e2e352d89826aef6dbd5ff8f',
        durationMs: 158040,
        uri: 'spotify:track:7K393v2v71W03V6w09J33b',
        previewUrl: null
      }
    ];
  }

  getClientId() {
    return (process.env.SPOTIFY_CLIENT_ID || this.clientId || '').trim();
  }

  getClientSecret() {
    return (process.env.SPOTIFY_CLIENT_SECRET || this.clientSecret || '').trim();
  }

  getRedirectUri() {
    return (process.env.SPOTIFY_REDIRECT_URI || this.redirectUri || 'http://localhost:5000/api/auth/spotify/callback').trim();
  }

  isConfigured() {
    const cid = this.getClientId();
    const sec = this.getClientSecret();
    return !!(
      cid &&
      sec &&
      cid !== 'your_spotify_client_id_here' &&
      sec !== 'your_spotify_client_secret_here'
    );
  }

  // Generate OAuth Login URL
  getAuthorizeUrl(state = '') {
    if (!this.isConfigured()) {
      return null;
    }
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.getClientId(),
      scope: this.scopes.join(' '),
      redirect_uri: this.getRedirectUri(),
      state: state,
      show_dialog: 'true'
    });
    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code) {
    if (!this.isConfigured()) {
      throw new Error('Spotify API credentials are not configured in environment variables.');
    }

    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    const redirectUri = this.getRedirectUri();

    // Print masked credentials and parameters for verification
    const maskedId = clientId.length > 4 ? `${clientId.slice(0, 2)}...${clientId.slice(-2)}` : '****';
    const maskedSecret = clientSecret.length > 4 ? `${clientSecret.slice(0, 2)}...${clientSecret.slice(-2)}` : '****';
    const maskedCode = code.length > 8 ? `${code.slice(0, 4)}...${code.slice(-4)}` : '****';

    console.log('[SpotifyService] Initiating token exchange:', {
      clientId: maskedId,
      clientSecret: maskedSecret,
      redirectUri: redirectUri,
      code: maskedCode
    });

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${authHeader}`
          }
        }
      );

      console.log('[SpotifyService] Token exchange SUCCESS! Received access_token (expires in:', response.data.expires_in, 's)');

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in
      };
    } catch (err) {
      console.error('[SpotifyService] ❌ Spotify Token Exchange Failed!');
      console.error('Status:', err.response?.status, err.response?.statusText);
      console.error('Response Body:', JSON.stringify(err.response?.data, null, 2));

      const errData = err.response?.data;
      const errorMsg =
        errData?.error_description ||
        errData?.error ||
        err.message ||
        'Unknown token exchange error';

      throw new Error(`Spotify token exchange error (${err.response?.status || 500}): ${errorMsg}`);
    }
  }

  // Fetch Spotify User Profile
  async getUserProfile(accessToken) {
    try {
      console.log('[SpotifyService] Fetching user profile from /v1/me...');
      const response = await axios.get('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      console.log('[SpotifyService] User profile fetched successfully:', response.data.display_name, `(${response.data.id})`);
      return response.data;
    } catch (err) {
      console.error('[SpotifyService] ❌ Spotify getUserProfile Failed!');
      console.error('Status:', err.response?.status, err.response?.statusText);
      console.error('Response Body:', JSON.stringify(err.response?.data, null, 2));

      const errData = err.response?.data;
      const spotifyError = errData?.error?.message || errData?.message || err.message;

      if (err.response?.status === 403) {
        throw new Error(
          `Spotify 403 Forbidden: "${spotifyError}". Note: If your Spotify App is in Development Mode, your Spotify account email/name must be added to 'User Management' in the Spotify Developer Dashboard.`
        );
      }

      throw new Error(`Spotify profile fetch error (${err.response?.status || 500}): ${spotifyError}`);
    }
  }

  // Refresh User Access Token if expired
  async getValidUserAccessToken(user) {
    if (!user) return null;

    let accessToken = user.spotifyAccessToken;
    let refreshToken = user.spotifyRefreshToken;
    let expiresAt = user.spotifyTokenExpiresAt;

    // If tokens are not loaded (due to select: false), query database safely
    if (!refreshToken && user._id) {
      try {
        const fullUser = await User.findById(user._id).select(
          '+spotifyAccessToken +spotifyRefreshToken'
        );
        if (fullUser) {
          accessToken = fullUser.spotifyAccessToken;
          refreshToken = fullUser.spotifyRefreshToken;
          expiresAt = fullUser.spotifyTokenExpiresAt;
        }
      } catch (err) {
        console.warn('[SpotifyService] User query in getValidUserAccessToken:', err.message);
      }
    }

    if (!accessToken && !refreshToken) {
      return null;
    }

    // Check if token is still valid (with 60-second buffer)
    const isExpired = !expiresAt || new Date(expiresAt).getTime() - 60000 < Date.now();

    if (!isExpired && accessToken) {
      return accessToken;
    }

    // Refresh token using Spotify OAuth refresh token endpoint
    if (refreshToken && this.isConfigured()) {
      try {
        console.log('[SpotifyService] Access token expired or close to expiry. Refreshing token...');
        const clientId = this.getClientId();
        const clientSecret = this.getClientSecret();
        const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const params = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        });

        const response = await axios.post(
          'https://accounts.spotify.com/api/token',
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${authHeader}`
            }
          }
        );

        const newAccessToken = response.data.access_token;
        const newExpiresIn = response.data.expires_in || 3600;
        const newExpiresAt = new Date(Date.now() + newExpiresIn * 1000);

        console.log('[SpotifyService] ✅ Token successfully refreshed! Valid for', newExpiresIn, 'seconds');

        // Persist refreshed token to MongoDB if user._id exists
        if (user._id) {
          try {
            await User.findByIdAndUpdate(user._id, {
              spotifyAccessToken: newAccessToken,
              spotifyRefreshToken: response.data.refresh_token || refreshToken,
              spotifyTokenExpiresAt: newExpiresAt
            });
          } catch (updateErr) {
            console.warn('[SpotifyService] Could not persist refreshed token:', updateErr.message);
          }
        }

        return newAccessToken;
      } catch (err) {
        console.error('[SpotifyService] ❌ Failed to refresh Spotify user token:', err.response?.data || err.message);
        return null;
      }
    }

    return accessToken;
  }

  // Get App-Level Client Credentials Token (for general non-user searches)
  async getAppAccessToken() {
    if (!this.isConfigured()) {
      return null;
    }

    if (this.appAccessToken && this.appTokenExpiresAt && this.appTokenExpiresAt > Date.now() + 60000) {
      return this.appAccessToken;
    }

    try {
      const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const params = new URLSearchParams({
        grant_type: 'client_credentials'
      });

      const response = await axios.post('https://accounts.spotify.com/api/token', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${authHeader}`
        }
      });

      this.appAccessToken = response.data.access_token;
      this.appTokenExpiresAt = Date.now() + (response.data.expires_in || 3600) * 1000;
      return this.appAccessToken;
    } catch (err) {
      console.error('Failed to get Spotify Client Credentials token:', err.response?.data || err.message);
      return null;
    }
  }

  // Search Spotify tracks (Live Spotify Search with Mock Fallback)
  async searchTracks(query, user = null) {
    if (!query || !query.trim()) {
      return [];
    }

    const cleanQuery = query.trim();

    // 1. Try with user's access token if connected
    let token = null;
    if (user) {
      token = await this.getValidUserAccessToken(user);
    }

    // 2. Or fallback to app-level client credentials token
    if (!token) {
      token = await this.getAppAccessToken();
    }

    // If we have a valid token and Spotify is configured, perform real Spotify Search API call
    if (token) {
      try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
          params: {
            q: cleanQuery,
            type: 'track',
            limit: 20
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const tracks = response.data.tracks?.items || [];
        return tracks.map((item) => ({
          spotifyTrackId: item.id,
          name: item.name,
          artist: item.artists.map((a) => a.name).join(', '),
          albumName: item.album?.name || '',
          albumArt:
            item.album?.images?.[0]?.url ||
            item.album?.images?.[1]?.url ||
            'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
          durationMs: item.duration_ms,
          uri: item.uri,
          previewUrl: item.preview_url,
          popularity: item.popularity
        }));
      } catch (err) {
        console.error('Spotify Search API error:', err.response?.data || err.message);
        // If error, fall through to mock results
      }
    }

    // Fallback: search in mock catalog or dynamic mock generator
    const qLower = cleanQuery.toLowerCase();
    const matches = this.mockTracks.filter(
      (t) =>
        t.name.toLowerCase().includes(qLower) ||
        t.artist.toLowerCase().includes(qLower) ||
        t.albumName.toLowerCase().includes(qLower)
    );

    if (matches.length > 0) {
      return matches;
    }

    // Generate dynamic mock item if query isn't matched
    return [
      {
        spotifyTrackId: `mock_${Date.now()}_1`,
        name: cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1),
        artist: 'Featured Artist',
        albumName: 'PassTheAux Session Vol. 1',
        albumArt: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
        durationMs: 210000,
        uri: `spotify:track:mock_${Date.now()}_1`,
        previewUrl: 'https://p.scdn.co/mp3-preview/a96ec7f864cfbcf76a80d5006b539c29bf33fbcf'
      },
      ...this.mockTracks.slice(0, 4)
    ];
  }

  // Get Host's Active Spotify Devices
  async getDevices(user) {
    const token = await this.getValidUserAccessToken(user);
    if (!token) {
      return {
        success: false,
        code: 'NOT_CONNECTED',
        message: 'Host has not connected a Spotify account.',
        devices: []
      };
    }

    try {
      console.log('[SpotifyService] Fetching active devices from /v1/me/player/devices...');
      const response = await axios.get('https://api.spotify.com/v1/me/player/devices', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const devices = response.data.devices || [];
      console.log(`[SpotifyService] Found ${devices.length} Spotify device(s):`, devices.map(d => `${d.name} (${d.type}, active: ${d.is_active})`));
      return {
        success: true,
        devices
      };
    } catch (err) {
      console.error('[SpotifyService] Failed to get Spotify devices:', err.response?.data || err.message);
      const status = err.response?.status;
      const errorMsg = err.response?.data?.error?.message || err.message;

      if (status === 403) {
        return {
          success: false,
          code: 'PREMIUM_REQUIRED',
          message: 'Playback and device control require Spotify Premium.',
          devices: []
        };
      } else if (status === 401) {
        return {
          success: false,
          code: 'TOKEN_EXPIRED',
          message: 'Spotify authentication token expired. Please reconnect Spotify.',
          devices: []
        };
      }

      return {
        success: false,
        code: 'DEVICE_FETCH_ERROR',
        message: errorMsg,
        devices: []
      };
    }
  }

  // Transfer Playback to specific device
  async transferPlayback(user, deviceId, play = false) {
    const token = await this.getValidUserAccessToken(user);
    if (!token) {
      throw new Error('Spotify is not connected for this user.');
    }

    try {
      console.log(`[SpotifyService] Transferring playback to device: ${deviceId} (play: ${play})...`);
      await axios.put(
        'https://api.spotify.com/v1/me/player',
        {
          device_ids: [deviceId],
          play: play
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log(`[SpotifyService] Playback successfully transferred to device ${deviceId}`);
      return { success: true };
    } catch (err) {
      console.error('[SpotifyService] Transfer playback failed:', err.response?.data || err.message);
      const status = err.response?.status;
      const errorMsg = err.response?.data?.error?.message || err.message;

      if (status === 403) {
        throw new Error('Spotify Premium is required to transfer playback.');
      } else if (status === 404) {
        throw new Error('Selected Spotify device is no longer online.');
      }
      throw new Error(`Failed to transfer playback: ${errorMsg}`);
    }
  }

  // Play a Spotify Track URI on host device
  async playTrack(user, trackUri, deviceId = null, positionMs = 0) {
    const token = await this.getValidUserAccessToken(user);
    if (!token) {
      console.warn('[SpotifyService] Cannot play on Spotify: User does not have active Spotify token.');
      return {
        success: false,
        code: 'NOT_CONNECTED',
        mode: 'mock',
        message: 'No active Spotify token found for room host.'
      };
    }

    try {
      const url = deviceId
        ? `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`
        : 'https://api.spotify.com/v1/me/player/play';

      console.log(`[SpotifyService] Triggering play on Spotify: ${trackUri} (device: ${deviceId || 'active'})...`);

      await axios.put(
        url,
        {
          uris: [trackUri],
          position_ms: positionMs
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('[SpotifyService] Spotify play command succeeded!');
      return { success: true, mode: 'live' };
    } catch (err) {
      console.error('[SpotifyService] Spotify Play API error:', err.response?.data || err.message);
      const status = err.response?.status;
      const reason = err.response?.data?.error?.reason;
      const errorMsg = err.response?.data?.error?.message || err.message;

      if (status === 404 || reason === 'NO_ACTIVE_DEVICE') {
        return {
          success: false,
          code: 'NO_ACTIVE_DEVICE',
          mode: 'error',
          message: 'No active Spotify device found. Please open Spotify on your device or enable the PassTheAux Web Player.'
        };
      } else if (status === 403 || reason === 'PREMIUM_REQUIRED') {
        return {
          success: false,
          code: 'PREMIUM_REQUIRED',
          mode: 'error',
          message: 'Spotify Premium is required for playback control.'
        };
      } else if (status === 401) {
        return {
          success: false,
          code: 'TOKEN_EXPIRED',
          mode: 'error',
          message: 'Spotify session expired. Please reconnect Spotify.'
        };
      }

      return {
        success: false,
        code: 'PLAY_ERROR',
        mode: 'error',
        message: errorMsg
      };
    }
  }

  // Pause playback
  async pauseTrack(user, deviceId = null) {
    const token = await this.getValidUserAccessToken(user);
    if (!token) return { success: false, code: 'NOT_CONNECTED' };

    try {
      const url = deviceId
        ? `https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`
        : 'https://api.spotify.com/v1/me/player/pause';

      await axios.put(
        url,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return { success: true };
    } catch (err) {
      console.error('[SpotifyService] Spotify Pause API error:', err.response?.data || err.message);
      return { success: false, error: err.message };
    }
  }

  // Get Currently Playing state from Spotify
  async getPlaybackState(user) {
    const token = await this.getValidUserAccessToken(user);
    if (!token) return null;

    try {
      const response = await axios.get('https://api.spotify.com/v1/me/player', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (err) {
      console.error('Failed to get playback state:', err.response?.data || err.message);
      return null;
    }
  }
}

const spotifyService = new SpotifyService();
export default spotifyService;
