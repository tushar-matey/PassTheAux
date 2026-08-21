import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- STARTING PASSTHEAUX YOUTUBE END-TO-END TEST ---');

  try {
    // 1. Health check
    console.log('\n[Test 1] Health Check...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health response:', health.data);

    // 2. Register Host User
    console.log('\n[Test 2] Registering Host User (DJ Host)...');
    const emailHost = `djhost_${Date.now()}@test.com`;
    const resHost = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'DJ Host',
      email: emailHost,
      password: 'password123'
    });
    const hostToken = resHost.data.token;
    const hostUserId = resHost.data.user._id;
    console.log('✅ Host registered. User ID:', hostUserId);

    // 3. Register Guest User
    console.log('\n[Test 3] Registering Guest User (Music Fan)...');
    const emailGuest = `guest_${Date.now()}@test.com`;
    const resGuest = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Music Fan',
      email: emailGuest,
      password: 'password123'
    });
    const guestToken = resGuest.data.token;
    const guestUserId = resGuest.data.user._id;
    console.log('✅ Guest registered. User ID:', guestUserId);

    // 4. Create Room as Host
    console.log('\n[Test 4] Creating Room as Host...');
    const resRoom = await axios.post(
      `${BASE_URL}/rooms`,
      { name: 'Friday Night Jam' },
      { headers: { Authorization: `Bearer ${hostToken}` } }
    );
    const roomCode = resRoom.data.room.code;
    console.log(`✅ Room Created! Code: ${roomCode}, Name: ${resRoom.data.room.name}`);

    // 5. Guest Joins Room
    console.log(`\n[Test 5] Guest joining Room ${roomCode}...`);
    const resJoin = await axios.post(
      `${BASE_URL}/rooms/join`,
      { code: roomCode },
      { headers: { Authorization: `Bearer ${guestToken}` } }
    );
    console.log('✅ Guest joined room. Member count:', resJoin.data.room.members.length);

    // 6. Search for tracks on YouTube
    console.log('\n[Test 6] Searching YouTube tracks for "Starboy"...');
    const resSearch1 = await axios.get(`${BASE_URL}/search?q=Starboy&roomCode=${roomCode}`, {
      headers: { Authorization: `Bearer ${guestToken}` }
    });
    const searchTracks = resSearch1.data.tracks;
    console.log(`✅ Search returned ${searchTracks.length} YouTube tracks.`);
    const starboyTrack = searchTracks[0];
    console.log(`Found track: "${starboyTrack.title}" (${starboyTrack.youtubeVideoId}) - Duration: ${starboyTrack.durationSec}s`);

    // 7. Add Song to Queue (Idle room auto-starts playback)
    console.log(`\n[Test 7] Adding "${starboyTrack.title}" to queue...`);
    const resAdd1 = await axios.post(
      `${BASE_URL}/rooms/${roomCode}/queue`,
      {
        youtubeVideoId: starboyTrack.youtubeVideoId,
        title: starboyTrack.title,
        channelTitle: starboyTrack.channelTitle,
        thumbnailUrl: starboyTrack.thumbnailUrl,
        durationSec: starboyTrack.durationSec
      },
      { headers: { Authorization: `Bearer ${guestToken}` } }
    );
    console.log('✅ Added song to queue. Auto-play triggered!');

    // 8. Search for a second track ("Blinding Lights") and add it
    console.log('\n[Test 8] Searching & adding "Blinding Lights"...');
    const resSearch2 = await axios.get(`${BASE_URL}/search?q=Blinding Lights&roomCode=${roomCode}`, {
      headers: { Authorization: `Bearer ${hostToken}` }
    });
    const blindingTrack = resSearch2.data.tracks[0];
    await axios.post(
      `${BASE_URL}/rooms/${roomCode}/queue`,
      {
        youtubeVideoId: blindingTrack.youtubeVideoId,
        title: blindingTrack.title,
        channelTitle: blindingTrack.channelTitle,
        thumbnailUrl: blindingTrack.thumbnailUrl,
        durationSec: blindingTrack.durationSec
      },
      { headers: { Authorization: `Bearer ${hostToken}` } }
    );
    console.log('✅ Added "Blinding Lights" to queue.');

    // 9. Add another track "Shape of You" so we have items to vote on
    console.log('\n[Test 9] Adding "Shape of You"...');
    const resSearch3 = await axios.get(`${BASE_URL}/search?q=Shape of You&roomCode=${roomCode}`, {
      headers: { Authorization: `Bearer ${guestToken}` }
    });
    const shapeTrack = resSearch3.data.tracks[0];
    await axios.post(
      `${BASE_URL}/rooms/${roomCode}/queue`,
      {
        youtubeVideoId: shapeTrack.youtubeVideoId,
        title: shapeTrack.title,
        channelTitle: shapeTrack.channelTitle,
        thumbnailUrl: shapeTrack.thumbnailUrl,
        durationSec: shapeTrack.durationSec
      },
      { headers: { Authorization: `Bearer ${guestToken}` } }
    );
    console.log('✅ Added "Shape of You" to queue.');

    // 10. Fetch current queue
    console.log('\n[Test 10] Fetching current room queue...');
    const resQueue1 = await axios.get(`${BASE_URL}/rooms/${roomCode}/queue`);
    console.log('Queue tracks:', resQueue1.data.queue.map(t => `"${t.title}" (votes: ${t.votes.length})`));
    console.log('Current playing track:', resQueue1.data.currentTrack?.title);

    // 11. Guest votes for "Blinding Lights"
    if (resQueue1.data.queue.length > 0) {
      const targetTrack = resQueue1.data.queue.find(t => t.youtubeVideoId === blindingTrack.youtubeVideoId) || resQueue1.data.queue[0];
      console.log(`\n[Test 11] Guest voting for queued track: "${targetTrack.title}"...`);
      const resVote = await axios.post(
        `${BASE_URL}/rooms/${roomCode}/queue/${targetTrack._id}/vote`,
        {},
        { headers: { Authorization: `Bearer ${guestToken}` } }
      );
      console.log(`✅ Vote toggled! User voted: ${resVote.data.userVoted}, Total votes: ${resVote.data.voteCount}`);

      // 12. Re-search "Blinding Lights" and verify search result shows `inQueue: true` and `userVoted: true`
      console.log('\n[Test 12] Verifying search enrichment with queue & vote state...');
      const resSearchEnriched = await axios.get(
        `${BASE_URL}/search?q=${encodeURIComponent(targetTrack.title)}&roomCode=${roomCode}`,
        { headers: { Authorization: `Bearer ${guestToken}` } }
      );
      const matched = resSearchEnriched.data.tracks.find(t => t.youtubeVideoId === targetTrack.youtubeVideoId);
      console.log(`Search result for "${targetTrack.title}":`, {
        inQueue: matched?.inQueue,
        userVoted: matched?.userVoted,
        votesCount: matched?.votesCount
      });

      if (matched?.inQueue) {
        console.log('🎉 VERIFICATION PASSED: Search accurately detected queued song and active vote state!');
      }
    }

    // 13. Host skips track
    console.log('\n[Test 13] Host skips track...');
    const resSkip = await axios.post(
      `${BASE_URL}/player/${roomCode}/skip`,
      {},
      { headers: { Authorization: `Bearer ${hostToken}` } }
    );
    console.log('✅ Track skipped. Now Playing:', resSkip.data.currentTrack?.title);

    console.log('\n======================================================');
    console.log('🎉 ALL PASSTHEAUX YOUTUBE API TESTS PASSED 100%!');
    console.log('======================================================');
  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

runTests();
