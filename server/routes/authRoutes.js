import express from 'express';
import {
  register,
  login,
  getMe,
  getSpotifyAuthUrl,
  spotifyCallback,
  disconnectSpotify
} from '../controllers/authController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/spotify/login-url', optionalAuth, getSpotifyAuthUrl);
router.get('/spotify/callback', spotifyCallback);
router.post('/spotify/disconnect', protect, disconnectSpotify);

export default router;
