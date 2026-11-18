import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Room from '../models/Room.js';

describe('Room Model - getSortedQueue', () => {
  it('should sort unplayed queue by votes descending and addedAt ascending', () => {
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();
    const userC = new mongoose.Types.ObjectId();

    const room = new Room({
      code: 'TEST01',
      name: 'Test Room',
      hostUserId: userA,
      queue: [
        {
          youtubeVideoId: 'video1',
          title: 'Track With 1 Vote (Earlier)',
          channelTitle: 'Artist A',
          durationSec: 180,
          addedBy: { userId: userA, name: 'Alice' },
          addedAt: new Date('2026-01-01T10:00:00Z'),
          votes: [{ userId: userB }],
          played: false,
        },
        {
          youtubeVideoId: 'video2',
          title: 'Track With 3 Votes (Highest)',
          channelTitle: 'Artist B',
          durationSec: 200,
          addedBy: { userId: userB, name: 'Bob' },
          addedAt: new Date('2026-01-01T10:05:00Z'),
          votes: [{ userId: userA }, { userId: userB }, { userId: userC }],
          played: false,
        },
        {
          youtubeVideoId: 'video3',
          title: 'Track With 1 Vote (Later)',
          channelTitle: 'Artist C',
          durationSec: 210,
          addedBy: { userId: userC, name: 'Charlie' },
          addedAt: new Date('2026-01-01T10:10:00Z'),
          votes: [{ userId: userA }],
          played: false,
        },
        {
          youtubeVideoId: 'video4',
          title: 'Already Played Track',
          channelTitle: 'Artist D',
          durationSec: 190,
          addedBy: { userId: userA, name: 'Alice' },
          addedAt: new Date('2026-01-01T09:00:00Z'),
          votes: [{ userId: userA }, { userId: userB }],
          played: true,
        },
      ],
    });

    const sorted = room.getSortedQueue();

    // Should exclude played tracks (length 3, not 4)
    assert.equal(sorted.length, 3);

    // Highest votes first
    assert.equal(sorted[0].youtubeVideoId, 'video2');

    // Tied votes broken by earlier addedAt
    assert.equal(sorted[1].youtubeVideoId, 'video1');
    assert.equal(sorted[2].youtubeVideoId, 'video3');
  });
});
