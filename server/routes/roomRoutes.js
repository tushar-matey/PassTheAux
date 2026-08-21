import express from 'express';
import {
  createRoom,
  joinRoom,
  getRoom,
  updateRoomSettings
} from '../controllers/roomController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, createRoom);
router.post('/join', optionalAuth, joinRoom);
router.get('/:code', optionalAuth, getRoom);
router.patch('/:code/settings', protect, updateRoomSettings);

export default router;
