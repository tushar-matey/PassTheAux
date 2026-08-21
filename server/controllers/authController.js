import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import spotifyService from '../services/spotifyService.js';

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'passtheaux_dev_secret_key_2026_super_secure',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.'
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isHost: user.isHost,
        spotifyConnected: user.isSpotifyConnected(),
        spotifyProfile: user.spotifyProfile
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration.'
    });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user._id);

    return res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isHost: user.isHost,
        spotifyConnected: user.isSpotifyConnected(),
        spotifyProfile: user.spotifyProfile
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during login.'
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isHost: user.isHost,
        spotifyConnected: user.isSpotifyConnected(),
        spotifyProfile: user.spotifyProfile,
        hasSpotifyPremium: user.hasSpotifyPremium()
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Spotify OAuth Authorization URL
// @route   GET /api/auth/spotify/login-url
export const getSpotifyAuthUrl = async (req, res) => {
  try {
    // If user is logged in, include user ID in state to attach Spotify account
    const state = req.user ? req.user._id.toString() : 'guest';
    const authUrl = spotifyService.getAuthorizeUrl(state);

    if (!authUrl) {
      return res.status(400).json({
        success: false,
        message: 'Spotify API credentials are not configured in server environment variables.'
      });
    }

    return res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// In-memory cache to prevent duplicate authorization code exchanges
const processedCodes = new Map();

// @desc    Handle Spotify OAuth callback
// @route   GET /api/auth/spotify/callback
export const spotifyCallback = async (req, res) => {
  const { code, state, error } = req.query;
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

  console.log('[Spotify Callback] Received callback with query:', {
    hasCode: !!code,
    state,
    error
  });

  if (error || !code) {
    console.error('[Spotify Callback] Error received from Spotify:', error);
    return res.redirect(`${clientUrl}/auth/spotify-callback?error=${encodeURIComponent(error || 'Access denied by Spotify')}`);
  }

  // Idempotency check: prevent duplicate requests with the same code
  if (processedCodes.has(code)) {
    console.warn('[Spotify Callback] Code already processed or in-flight:', code.slice(0, 8));
    const cached = processedCodes.get(code);
    if (cached.jwtToken) {
      return res.redirect(`${clientUrl}/auth/spotify-callback?token=${cached.jwtToken}&spotifyConnected=true`);
    }
    return res.redirect(`${clientUrl}/auth/spotify-callback?error=${encodeURIComponent('Authorization code was already used. Please try logging in again.')}`);
  }

  // Mark code as processing
  processedCodes.set(code, { timestamp: Date.now(), inFlight: true });
  // Clean up old codes after 5 minutes
  setTimeout(() => processedCodes.delete(code), 300000);

  try {
    const tokenData = await spotifyService.exchangeCodeForTokens(code);
    const spotifyProfile = await spotifyService.getUserProfile(tokenData.accessToken);

    let user = null;

    // If state contains a valid user ID, connect to that user
    if (state && state !== 'guest') {
      user = await User.findById(state);
    }

    // If user wasn't found by state, find by Spotify ID or email, or create new user
    if (!user) {
      user = await User.findOne({
        $or: [
          { 'spotifyProfile.id': spotifyProfile.id },
          { email: spotifyProfile.email?.toLowerCase() }
        ]
      });
    }

    if (!user) {
      // Create new user from Spotify profile
      user = new User({
        name: spotifyProfile.display_name || 'Spotify Listener',
        email: spotifyProfile.email ? spotifyProfile.email.toLowerCase() : `spotify_${spotifyProfile.id}@passtheaux.app`,
        password: Math.random().toString(36).slice(-10) // random placeholder password
      });
    }

    // Save tokens and Spotify profile
    user.spotifyAccessToken = tokenData.accessToken;
    user.spotifyRefreshToken = tokenData.refreshToken || user.spotifyRefreshToken;
    user.spotifyTokenExpiresAt = new Date(Date.now() + tokenData.expiresIn * 1000);
    user.spotifyProfile = {
      id: spotifyProfile.id,
      displayName: spotifyProfile.display_name,
      email: spotifyProfile.email,
      product: spotifyProfile.product, // 'premium' / 'free'
      images: spotifyProfile.images ? spotifyProfile.images.map((img) => img.url) : [],
      uri: spotifyProfile.uri
    };
    user.isHost = spotifyProfile.product === 'premium';

    await user.save();

    const jwtToken = generateToken(user._id);

    // Save token to idempotency cache
    processedCodes.set(code, { timestamp: Date.now(), jwtToken });

    console.log(`[Spotify Callback] Successfully authenticated Spotify user: ${user.name} (${user.email})`);

    // Redirect to client callback route with token
    return res.redirect(
      `${clientUrl}/auth/spotify-callback?token=${jwtToken}&spotifyConnected=true`
    );
  } catch (err) {
    console.error('[Spotify Callback] ❌ Callback processing failed:', err.message);
    const displayError = err.message || 'Failed to authenticate with Spotify';
    return res.redirect(
      `${clientUrl}/auth/spotify-callback?error=${encodeURIComponent(displayError)}`
    );
  }
};

// @desc    Disconnect Spotify account
// @route   POST /api/auth/spotify/disconnect
export const disconnectSpotify = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.spotifyAccessToken = null;
    user.spotifyRefreshToken = null;
    user.spotifyTokenExpiresAt = null;
    user.spotifyProfile = {
      id: null,
      displayName: null,
      email: null,
      product: null,
      images: [],
      uri: null
    };

    await user.save();

    return res.json({
      success: true,
      message: 'Spotify account disconnected successfully.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
