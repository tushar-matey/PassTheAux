import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

console.log('--- SPOTIFY ENV VARS CHECK ---');
console.log('clientId:', clientId ? `${clientId.slice(0, 2)}...${clientId.slice(-2)} (len: ${clientId.length})` : 'UNDEFINED');
console.log('clientSecret:', clientSecret ? `${clientSecret.slice(0, 2)}...${clientSecret.slice(-2)} (len: ${clientSecret.length})` : 'UNDEFINED');
console.log('redirectUri:', redirectUri);

async function testTokenEndpoint() {
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  // Test 1: Client credentials grant
  console.log('\n[Test 1] Testing client_credentials token request...');
  try {
    const res = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${authHeader}`
        }
      }
    );
    console.log('✅ Client credentials success! Token type:', res.data.token_type, 'expires_in:', res.data.expires_in);
  } catch (err) {
    console.error('❌ Client credentials failed:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data
    });
  }

  // Test 2: Testing authorization_code grant with dummy code to see Spotify's exact error format
  console.log('\n[Test 2] Testing authorization_code grant with dummy code...');
  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: 'dummy_test_code_12345',
      redirect_uri: redirectUri
    });

    const res = await axios.post(
      'https://accounts.spotify.com/api/token',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${authHeader}`
        }
      }
    );
    console.log('Response:', res.data);
  } catch (err) {
    console.error('❌ Authorization code dummy test response:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data
    });
  }
}

testTokenEndpoint();
