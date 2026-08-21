import express from 'express';
import { searchTracks } from '../controllers/searchController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuth, searchTracks);

export default router;
