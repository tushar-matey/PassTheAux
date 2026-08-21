# 🎵 PassTheAux — Collaborative Music Voting App (MERN Stack)

**PassTheAux** is a real-time collaborative music democracy web application built on the MERN stack (MongoDB, Express, React, Node.js) with Socket.IO and the Spotify Web API. Multiple listeners can join a shared "room", search for any song on Spotify, and vote tracks up the queue in real time. The highest-voted song automatically plays next on the room host's connected Spotify Premium device!

---

## 🌟 Key Features

- 🔐 **Dual Authentication**: Sign up with standard Email + Password (JWT) or **"Continue with Spotify"** OAuth (Authorization Code flow with token auto-refresh).
- 🏷️ **6-Character Room Sessions**: Host instant listening parties with short room codes (e.g. `AUX882`) or shareable QR codes.
- 🔍 **Unified Search & Voting Interaction**:
  - Search any song across Spotify's global 100M+ track catalog by title, artist, or album.
  - **Live Queue Matching**:
    - If the song is already in the room's queue → Displays a **"Vote"** button with live vote counter.
    - If the song is not in the queue → Displays an **"Add to Queue"** button with 1 automatic vote from the adder.
- 📊 **Dynamic Real-Time Ranked Queue**: Songs dynamically reorder by vote count descending (`votes.length DESC, addedAt ASC`).
- 🎧 **Host Playback Control & Auto-Advance**:
  - Plays the top-voted track directly on the host's active Spotify player (Phone, Laptop, Web Player, Smart Speaker).
  - Background playback loop monitors track duration and triggers the next top-voted track automatically.
  - Fallback 30s audio previews for listeners directly inside the browser.
- ⚡ **Real-Time Sync with Socket.IO**:
  - Live broadcast of queue changes, upvotes, track transitions, member joins/leaves, and in-room chat reactions.
- 💎 **Ultra-Modern Glassmorphic Dark UI**: Custom neon glow accents, equalizer wave visualizers, spinning album art vinyl animations, and responsive layouts.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Vite, React Router 7, Tailwind CSS, Lucide Icons, Socket.IO Client, Axios, Canvas-Confetti, QRCode.react |
| **Backend** | Node.js, Express, Socket.IO, Mongoose, JWT, BcryptJS, Axios, Spotify Web API |
| **Database** | MongoDB (Collections: `users`, `rooms`) |
| **Audio / API** | Spotify Web API (Search, OAuth, Player Control) |

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MongoDB](https://www.mongodb.com/) (running locally on `mongodb://localhost:27017` or a MongoDB Atlas URI)
- Spotify Developer Account (for Live Spotify playback and OAuth)

---

### Step 1: Clone and Install Dependencies

From the root directory:
```bash
# Install root, server, and client dependencies in one command
npm run install-all
```

---

### Step 2: Configure Environment Variables

1. Create a `.env` file in the `server/` directory:
```bash
cp server/.env.example server/.env
```

2. Open `server/.env` and configure your settings:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

MONGO_URI=mongodb://localhost:27017/passtheaux
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Spotify Web API Credentials (see setup steps below)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:5000/api/auth/spotify/callback
```

---

### Step 3: Spotify Developer App Setup (for Live Spotify Mode)

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and log in.
2. Click **"Create App"**.
3. Fill in the details:
   - **App Name**: `PassTheAux`
   - **App Description**: `Collaborative music queue and voting app`
   - **Redirect URIs**: Add `http://localhost:5000/api/auth/spotify/callback`
   - Select **Web API** under APIs used.
4. Save the app and go to **Settings**.
5. Copy your **Client ID** and **Client Secret** into your `server/.env` file.
6. Under **User Management** (if in Development Mode), add the Spotify accounts of test users.

---

### Step 4: Run the Application

Start both the backend server and frontend client concurrently:

```bash
npm run dev
```

- **Client App**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 📡 API Endpoints Reference

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` — Register user with name, email, password.
- `POST /api/auth/login` — Login user and receive JWT.
- `GET /api/auth/me` — Fetch current user profile and Spotify connection status.
- `GET /api/auth/spotify/login-url` — Get Spotify OAuth authorization URL.
- `GET /api/auth/spotify/callback` — Spotify OAuth callback handler.
- `POST /api/auth/spotify/disconnect` — Disconnect Spotify account.

### 🏠 Rooms (`/api/rooms`)
- `POST /api/rooms` — Create a new session (returns 6-char code e.g. `AUX882`).
- `POST /api/rooms/join` — Join a room by code.
- `GET /api/rooms/:code` — Retrieve full room state, members, current track, and queue.
- `PATCH /api/rooms/:code/settings` — Update room settings (host only).

### 📋 Queue & Voting (`/api/rooms/:code/queue`)
- `GET /api/rooms/:code/queue` — Get unplayed queue sorted by `votes.length DESC, addedAt ASC`.
- `POST /api/rooms/:code/queue` — Add song to queue with 1 auto-vote from user.
- `POST /api/rooms/:code/queue/:trackId/vote` — Toggle vote on existing queued song.
- `DELETE /api/rooms/:code/queue/:trackId` — Remove track from queue (host or adder).

### 🔍 Spotify Search (`/api/search`)
- `GET /api/search?q=<query>&roomCode=<code>` — Search Spotify track catalog with live queue matching (`inQueue`, `userVoted`, `votesCount`).

### 🎛️ Playback & Devices (`/api/player`)
- `GET /api/player/devices` — List host's active Spotify devices (phone, laptop, speakers).
- `POST /api/player/:code/device` — Select room playback device.
- `POST /api/player/:code/toggle` — Play / Pause current track (host).
- `POST /api/player/:code/skip` — Skip to next top-voted track in queue (host).

---

## ⚡ Socket.IO Events Reference

| Event | Direction | Description |
| :--- | :--- | :--- |
| `join-room` | Client ➔ Server | User joins a room code room |
| `leave-room` | Client ➔ Server | User leaves a room |
| `queue-updated` | Server ➔ Room | Full sorted queue refreshed |
| `vote-updated` | Server ➔ Room | Single vote toggled + re-sorted queue |
| `track-changed` | Server ➔ Room | Next song started playing |
| `playback-state`| Server ➔ Room | Play/Pause/Progress update |
| `members-updated`| Server ➔ Room | Member joined or left |
| `send-message` | Client ➔ Server | Send in-session chat reaction |
| `chat-message` | Server ➔ Room | Broadcast chat reaction |

---

## 🧪 Testing and Verification

You can start the full stack application with:
```bash
npm run dev
```

Open two browser tabs (or incognito):
1. **Window 1 (Host)**: Sign up, create room `AUX...`, connect Spotify or choose device.
2. **Window 2 (Guest)**: Enter the 6-character room code, search for a song, and click **"Add"** or **"Vote"**.
3. Notice that both windows update **instantaneously in real-time** via Socket.IO!

---

## 📄 License
MIT License. Built with ❤️ for music lovers.
