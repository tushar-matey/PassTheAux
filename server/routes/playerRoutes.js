import express from 'express';
import {
  togglePlay,
  skipTrack,
  syncPlayback,
  getPlaybackStatus
} from '../controllers/playerController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/:code/status', optionalAuth, getPlaybackStatus);
router.post('/:code/toggle', protect, togglePlay);
router.post('/:code/skip', protect, skipTrack);
router.post('/:code/sync', protect, syncPlayback);

export default router;
