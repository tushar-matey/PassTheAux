import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Service imports
import socketService from './services/socketService.js';
import playbackService from './services/playbackService.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import queueRoutes from './routes/queueRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import playerRoutes from './routes/playerRoutes.js';

const app = express();
const httpServer = http.createServer(app);

// CORS configuration
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: [clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Socket.IO
socketService.init(httpServer);

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms/:code/queue', queueRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/player', playerRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'PassTheAux API',
    mongoConnected: mongoose.connection.readyState === 1
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[Error Handler]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Database Connection & Server Launch
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/passtheaux';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`[Database] MongoDB connected successfully to ${MONGO_URI}`);

    // Start background playback loop monitor
    playbackService.startMonitor();

    httpServer.listen(PORT, () => {
      console.log(`🚀 [PassTheAux Server] Running on http://localhost:${PORT}`);
      console.log(`📡 [Socket.IO] Ready for real-time room connections`);
    });
  })
  .catch((err) => {
    console.error('[Database] MongoDB connection failure:', err.message);
    process.exit(1);
  });

export default app;
