# 🎵 PassTheAux — Collaborative Music Voting App (MERN + YouTube)

**PassTheAux** is a real-time collaborative music democracy web application built on the MERN stack (MongoDB, Express, React, Node.js) with Socket.IO, YouTube Data API v3, and the YouTube IFrame Player API. Multiple listeners can join a shared "room", search for any song or music video on YouTube, and vote tracks up the queue in real time. The highest-voted song automatically plays next in synchronized playback across all connected browser clients!

---

## 🌟 Key Features

- 🔐 **Streamlined Authentication**: Sign up and login with standard Email + Password (JWT) — no Spotify account or third-party OAuth needed.
- 🏷️ **6-Character Room Sessions**: Host instant listening parties with short room codes (e.g. `AUX882`) or shareable QR codes.
- 🔍 **YouTube Track Search & Queue Matching**:
  - Search across YouTube's massive global catalog with accurate durations and high-res thumbnails.
  - **Live Queue Matching**:
    - If the song is already in the room's queue → Displays an interactive **"Vote"** button with live vote counter.
    - If the song is not in the queue → Displays an **"+ Add"** button with 1 automatic vote from the adder.
- 📊 **Dynamic Real-Time Ranked Queue**: Songs dynamically reorder by vote count descending (`votes.length DESC, addedAt ASC`).
- 🎧 **Synchronized In-Browser Playback**:
  - Embedded YouTube IFrame Player plays directly in every user's browser (no desktop apps or Spotify Premium required).
  - Designated room host controls Play / Pause / Skip / Seek.
  - Periodic host sync broadcasts (`playback-sync`) keep all listeners in sync with automated drift correction.
  - Host video completion (`onStateChange: YT.PlayerState.ENDED`) auto-advances to the next top-voted track.
- ⚡ **Real-Time Sync with Socket.IO**:
  - Live broadcast of queue changes, upvotes, track transitions, member joins/leaves, and in-room chat reactions.
- 💎 **Ultra-Modern Dark Cyberpunk Glassmorphic UI**: Custom neon glow accents, equalizer wave visualizers, album/video thumbnail visualizer, collapsible video player, and responsive mobile-first layouts.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Vite, React Router 7, Tailwind CSS, Lucide Icons, Socket.IO Client, Axios, Canvas-Confetti, QRCode.react, YouTube IFrame API |
| **Backend** | Node.js, Express, Socket.IO, Mongoose, JWT, BcryptJS, Axios, YouTube Data API v3 |
| **Database** | MongoDB (Collections: `users`, `rooms`) |
| **Playback & Search** | YouTube Data API v3 (Search & Video Details), YouTube IFrame Player API |

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MongoDB](https://www.mongodb.com/) (running locally on `mongodb://localhost:27017` or a MongoDB Atlas URI)
- Google Cloud API Key (for YouTube Data API v3) — *Note: PassTheAux includes a curated fallback catalog so the app also runs immediately without an API key!*

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

# YouTube Data API v3 Key (see setup steps below)
YOUTUBE_API_KEY=your_youtube_api_key_here
```

---

### Step 3: Getting a YouTube Data API v3 Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `PassTheAux`).
3. In the navigation menu, select **APIs & Services > Library**.
4. Search for **"YouTube Data API v3"** and click **Enable**.
5. Go to **APIs & Services > Credentials** and click **Create Credentials > API key**.
6. (Optional but recommended) Restrict the API key to the **YouTube Data API v3**.
7. Copy your API Key into `server/.env` as `YOUTUBE_API_KEY`.

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
- `GET /api/auth/me` — Fetch current user profile.

### 🏠 Rooms (`/api/rooms`)
- `POST /api/rooms` — Create a new session (returns 6-char code e.g. `AUX882`).
- `POST /api/rooms/join` — Join a room by code.
- `GET /api/rooms/:code` — Retrieve full room state, members, current track, and queue.
- `PATCH /api/rooms/:code/settings` — Update room settings (host only).

### 📋 Queue & Voting (`/api/rooms/:code/queue`)
- `GET /api/rooms/:code/queue` — Get unplayed queue sorted by `votes.length DESC, addedAt ASC`.
- `POST /api/rooms/:code/queue` — Add YouTube track to queue with 1 auto-vote from user.
- `POST /api/rooms/:code/queue/:trackId/vote` — Toggle vote on existing queued song.
- `DELETE /api/rooms/:code/queue/:trackId` — Remove track from queue (host or adder).

### 🔍 YouTube Search (`/api/search`)
- `GET /api/search?q=<query>&roomCode=<code>` — Search YouTube catalog with live queue matching (`inQueue`, `userVoted`, `votesCount`).

### 🎛️ Playback & Synchronization (`/api/player`)
- `GET /api/player/:code/status` — Get current track playback status.
- `POST /api/player/:code/toggle` — Play / Pause current track (host).
- `POST /api/player/:code/skip` — Skip to next top-voted track in queue (host).
- `POST /api/player/:code/sync` — Host syncs playback progress with room.

---

## ⚡ Socket.IO Events Reference

| Event | Direction | Description |
| :--- | :--- | :--- |
| `join-room` | Client ➔ Server | User joins a room code |
| `leave-room` | Client ➔ Server | User leaves a room |
| `queue-updated` | Server ➔ Room | Full sorted queue refreshed |
| `vote-updated` | Server ➔ Room | Single vote toggled + re-sorted queue |
| `track-changed` | Server ➔ Room | Next song started playing |
| `track-ended` | Host ➔ Server | Host video ended, server auto-advances queue |
| `playback-sync` | Host ➔ Room | Broadcast timestamp & playing state to keep clients synced |
| `seek-playback` | Host ➔ Room | Broadcast seek position to all listeners |
| `playback-state`| Server ➔ Room | Play/Pause state update |
| `members-updated`| Server ➔ Room | Member joined or left |
| `send-message` | Client ➔ Server | Send in-session chat reaction |
| `chat-message` | Server ➔ Room | Broadcast chat reaction |

---

## 🧪 Testing and Verification

Run the automated backend test suite:
```bash
npm run test-youtube --prefix server
# or: node server/test_youtube_e2e.js (with server running)
```

### Manual Multi-Client Sync Test
1. Open two browser windows:
   - **Window 1 (Host)**: Sign up, create room `AUX...`.
   - **Window 2 (Guest)**: Enter the 6-character room code, search for a song, and click **"Add"** or **"Vote"**.
2. Notice that both windows update **instantaneously in real-time** via Socket.IO.
3. Toggle Play/Pause or Skip in the host window, and verify both YouTube players stay in sync!

---

## 📄 License
MIT License. Built with ❤️ for music lovers.
