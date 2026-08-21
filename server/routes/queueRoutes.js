import express from 'express';
import {
  getQueue,
  addToQueue,
  toggleVote,
  removeFromQueue
} from '../controllers/queueController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

router.get('/', optionalAuth, getQueue);
router.post('/', protect, addToQueue);
router.post('/:trackId/vote', protect, toggleVote);
router.delete('/:trackId', protect, removeFromQueue);

export default router;
