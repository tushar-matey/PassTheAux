import mongoose from 'mongoose';

const trackSchema = new mongoose.Schema({
  spotifyTrackId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  artist: {
    type: String,
    required: true
  },
  albumArt: {
    type: String,
    default: ''
  },
  albumName: {
    type: String,
    default: ''
  },
  durationMs: {
    type: Number,
    required: true
  },
  uri: {
    type: String,
    required: true
  },
  previewUrl: {
    type: String,
    default: null
  },
  addedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    }
  },
  votes: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      votedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  addedAt: {
    type: Date,
    default: Date.now
  },
  played: {
    type: Boolean,
    default: false
  },
  playedAt: {
    type: Date,
    default: null
  }
});

const currentTrackSchema = new mongoose.Schema({
  spotifyTrackId: { type: String, default: null },
  name: { type: String, default: null },
  artist: { type: String, default: null },
  albumArt: { type: String, default: '' },
  albumName: { type: String, default: '' },
  durationMs: { type: Number, default: 0 },
  uri: { type: String, default: null },
  previewUrl: { type: String, default: null },
  addedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, default: '' }
  },
  startedAt: { type: Date, default: null },
  isPlaying: { type: Boolean, default: false },
  progressMs: { type: Number, default: 0 },
  lastSyncedAt: { type: Date, default: Date.now }
});

const memberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  isOnline: {
    type: Boolean,
    default: true
  },
  socketId: {
    type: String,
    default: null
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

const roomSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'Aux Session'
    },
    hostUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: [memberSchema],
    queue: [trackSchema],
    currentTrack: {
      type: currentTrackSchema,
      default: () => ({})
    },
    history: [trackSchema],
    settings: {
      autoPlay: {
        type: Boolean,
        default: true
      },
      voteThresholdToSkip: {
        type: Number,
        default: 50 // Percentage of active members needed to skip
      },
      allowDuplicateTracksInHistory: {
        type: Boolean,
        default: true
      }
    },
    activeDeviceId: {
      type: String,
      default: null
    },
    activeDeviceName: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Method to get active unplayed queue sorted by vote count DESC, addedAt ASC
roomSchema.methods.getSortedQueue = function () {
  const activeQueue = this.queue.filter((track) => !track.played);
  return activeQueue.sort((a, b) => {
    const votesDiff = (b.votes?.length || 0) - (a.votes?.length || 0);
    if (votesDiff !== 0) {
      return votesDiff;
    }
    return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
  });
};

const Room = mongoose.model('Room', roomSchema);
export default Room;
