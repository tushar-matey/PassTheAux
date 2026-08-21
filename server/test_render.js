import axios from 'axios';

const BASE_URL = 'https://passtheaux.onrender.com/api';

async function testRenderDeployment() {
  console.log('--- TESTING LIVE RENDER BACKEND (https://passtheaux.onrender.com) ---');

  try {
    // 1. Health check
    console.log('\n[1] Pinging Health Check...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health response:', health.data);

    // 2. Register a test user
    console.log('\n[2] Registering User on Render...');
    const testUser = {
      name: 'Render Tester',
      email: `rendertest_${Date.now()}@aux.com`,
      password: 'password123'
    };
    const regRes = await axios.post(`${BASE_URL}/auth/register`, testUser);
    const token = regRes.data.token;
    console.log('✅ User registered successfully. ID:', regRes.data.user._id);

    // 3. Create a room
    console.log('\n[3] Creating Room on Render...');
    const roomRes = await axios.post(
      `${BASE_URL}/rooms`,
      { name: 'Render Aux Room' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const roomCode = roomRes.data.room.code;
    console.log(`✅ Room created on Render! Code: ${roomCode}`);

    // 4. Search tracks
    console.log('\n[4] Testing Spotify Track Search on Render...');
    const searchRes = await axios.get(`${BASE_URL}/search?q=Starboy&roomCode=${roomCode}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Search returned ${searchRes.data.tracks.length} tracks.`);
    const track = searchRes.data.tracks[0];
    console.log(`Track: "${track.name}" by ${track.artist}`);

    // 5. Add to queue
    console.log('\n[5] Adding track to queue on Render...');
    const addRes = await axios.post(
      `${BASE_URL}/rooms/${roomCode}/queue`,
      {
        spotifyTrackId: track.spotifyTrackId,
        name: track.name,
        artist: track.artist,
        albumArt: track.albumArt,
        albumName: track.albumName,
        durationMs: track.durationMs,
        uri: track.uri,
        previewUrl: track.previewUrl
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Track added to queue successfully on Render!');

    console.log('\n======================================================');
    console.log('🎉 RENDER BACKEND IS FULLY CONNECTED & FUNCTIONAL 100%');
    console.log('======================================================');
  } catch (err) {
    console.error('❌ Render test failed:', err.response?.data || err.message);
  }
}

testRenderDeployment();
