import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Exclude from normal queries by default
    },
    spotifyAccessToken: {
      type: String,
      default: null,
      select: false
    },
    spotifyRefreshToken: {
      type: String,
      default: null,
      select: false
    },
    spotifyTokenExpiresAt: {
      type: Date,
      default: null
    },
    spotifyProfile: {
      id: { type: String, default: null },
      displayName: { type: String, default: null },
      email: { type: String, default: null },
      product: { type: String, default: null }, // 'premium', 'free', etc.
      images: [{ type: String }],
      uri: { type: String, default: null }
    },
    isHost: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password helper
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if user has connected Spotify
userSchema.methods.isSpotifyConnected = function () {
  return !!(this.spotifyProfile && this.spotifyProfile.id);
};

// Check if Spotify user has Premium
userSchema.methods.hasSpotifyPremium = function () {
  return this.spotifyProfile?.product === 'premium';
};

const User = mongoose.model('User', userSchema);
export default User;
