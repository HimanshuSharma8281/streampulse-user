# 🔴 StreamPulse Viewer (`streampulse-user`)

The standalone public viewer application for the StreamPulse live streaming platform.

---

## 🌟 Features

- **Ultra-Low Latency Player**: High-definition WebRTC video playback with custom player controls (fullscreen, theater mode, volume slider, mute toggle).
- **Live Viewer Presence**: Dynamic viewer counter with automatic heartbeat presence tracking.
- **Interactive Community Chat**: Sub-millisecond live chat with custom handles and quick emoji reactions.
- **₹5 Paywall Gate**: Built-in pay-per-stream modal integration for monetized broadcasts.
- **Strict Privacy**: Contains zero admin controls, zero admin endpoints, and zero admin secrets.

---

## 🚀 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env.local`:
```env
# Optional: URL of the streaming backend / signaling server (leave empty if on same domain or proxy)
NEXT_PUBLIC_STREAM_SERVER_URL=http://localhost:3000

# Optional: Supabase Client Public Keys
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### 3. Run Development Server
```bash
npm run dev
```

Open `http://localhost:3000` or `http://localhost:3000/live` to watch the stream.

---

## 🚀 GitHub & Vercel Deployment Instructions

### 1. Create and Push to GitHub
```bash
cd streampulse-user
git init
git add .
git commit -m "feat: initial streampulse-user viewer app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/streampulse-user.git
git push -u origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Import the `streampulse-user` repository.
3. Framework Preset: **Next.js**.
4. In **Environment Variables**, add:
   - `NEXT_PUBLIC_STREAM_SERVER_URL` = `https://your-streaming-backend.com` (or your deployed signaling server URL)
   - `NEXT_PUBLIC_SUPABASE_URL` (optional)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (optional)
5. Click **Deploy**.
