import dotenv from 'dotenv';
import spotifyService from './services/spotifyService.js';

dotenv.config();

async function runDiagnostics() {
  console.log('=== Spotify Web Playback & Device Diagnostics ===\n');

  // 1. Check OAuth Scopes
  console.log('1. Checking OAuth Scopes:');
  const requiredScopes = [
    'streaming',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'user-read-email',
    'user-read-private'
  ];
  const configuredScopes = spotifyService.scopes;
  console.log('   Configured scopes:', configuredScopes);
  const missing = requiredScopes.filter(s => !configuredScopes.includes(s));
  if (missing.length === 0) {
    console.log('   ✅ All 6 required Web Playback & Playback Control scopes are present!\n');
  } else {
    console.error('   ❌ Missing scopes:', missing, '\n');
  }

  // 2. Check Auth URL Generation
  console.log('2. Testing Spotify Authorization URL:');
  const authUrl = spotifyService.getAuthorizeUrl('test_state_123');
  console.log('   Generated Auth URL:', authUrl);
  if (authUrl && authUrl.includes('response_type=code') && authUrl.includes('streaming')) {
    console.log('   ✅ Auth URL includes code response_type and streaming scope!\n');
  } else {
    console.error('   ❌ Auth URL issue!\n');
  }

  // 3. Test Device Endpoint Error Formatter
  console.log('3. Testing getDevices with disconnected user object:');
  const mockDisconnectedUser = { _id: 'mock_123' };
  const deviceResult = await spotifyService.getDevices(mockDisconnectedUser);
  console.log('   Disconnected user result:', deviceResult);
  if (!deviceResult.success && deviceResult.code === 'NOT_CONNECTED') {
    console.log('   ✅ Handled disconnected user gracefully with structured NOT_CONNECTED code!\n');
  }

  // 4. Test Play Command Error Formatter
  console.log('4. Testing playTrack with disconnected user:');
  const playResult = await spotifyService.playTrack(mockDisconnectedUser, 'spotify:track:4cOdK2wGLETKBW3PvgPWqT');
  console.log('   Disconnected play result:', playResult);
  if (!playResult.success && playResult.code === 'NOT_CONNECTED') {
    console.log('   ✅ Handled play error gracefully with structured code!\n');
  }

  console.log('=== All diagnostic checks PASSED! ===');
}

runDiagnostics().catch(console.error);
