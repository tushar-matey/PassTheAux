import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach Authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('passtheaux_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle global errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

// Auth API calls
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  getSpotifyLoginUrl: () => api.get('/auth/spotify/login-url'),
  disconnectSpotify: () => api.post('/auth/spotify/disconnect')
};

// Rooms API calls
export const roomApi = {
  createRoom: (data) => api.post('/rooms', data),
  joinRoom: (code) => api.post('/rooms/join', { code }),
  getRoom: (code) => api.get(`/rooms/${code}`),
  updateSettings: (code, settings) => api.patch(`/rooms/${code}/settings`, settings)
};

// Queue API calls
export const queueApi = {
  getQueue: (code) => api.get(`/rooms/${code}/queue`),
  addToQueue: (code, trackData) => api.post(`/rooms/${code}/queue`, trackData),
  toggleVote: (code, trackId) => api.post(`/rooms/${code}/queue/${trackId}/vote`),
  removeFromQueue: (code, trackId) => api.delete(`/rooms/${code}/queue/${trackId}`)
};

// Search API calls (with live queue status enrichment)
export const searchApi = {
  searchTracks: (query, roomCode) =>
    api.get('/search', {
      params: {
        q: query,
        roomCode: roomCode || undefined
      }
    })
};

// Player API calls
export const playerApi = {
  getStatus: (code) => api.get(`/player/${code}/status`),
  togglePlay: (code, play) => api.post(`/player/${code}/toggle`, { play }),
  skipTrack: (code) => api.post(`/player/${code}/skip`),
  getHostDevices: () => api.get('/player/devices'),
  setRoomDevice: (code, deviceId, deviceName) =>
    api.post(`/player/${code}/device`, { deviceId, deviceName })
};

export default api;
