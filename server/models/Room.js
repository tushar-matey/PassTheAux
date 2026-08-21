import mongoose from 'mongoose';

const trackSchema = new mongoose.Schema({
  youtubeVideoId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  channelTitle: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String,
    default: ''
  },
  durationSec: {
    type: Number,
    required: true,
    default: 0
  },
  durationMs: {
    type: Number,
    default: 0
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
  youtubeVideoId: { type: String, default: null },
  title: { type: String, default: null },
  channelTitle: { type: String, default: null },
  thumbnailUrl: { type: String, default: '' },
  durationSec: { type: Number, default: 0 },
  durationMs: { type: Number, default: 0 },
  addedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, default: '' }
  },
  startedAt: { type: Date, default: null },
  isPlaying: { type: Boolean, default: false },
  progressSec: { type: Number, default: 0 },
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
