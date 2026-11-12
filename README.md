# ✏️ Sketch Party

A multiplayer draw-and-guess party game with a twist. One player draws an AI-picked word, everyone else races to guess it. Hints come as emojis, riddles and sounds instead of letters, and random round modifiers and sabotage keep every turn chaotic. Playing alone? AI players fill the empty seats.

**▶ Play now:** https://sketch-party-k0ic.onrender.com

> 🚧 Early development. See [PLAN.md](PLAN.md) for the roadmap.

## Run it locally

Requires Node 22+.

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Open a second tab to see the online player count change.

## Production build

```bash
npm run build
npm start
```

The server runs on `PORT` (default 3001) and serves the built client from the same URL.

## Deploy your own (Render, free tier)

1. Fork or push this repo to GitHub.
2. In Render: **New → Blueprint**, pick the repo. Render reads `render.yaml`.
3. When asked, set `ANTHROPIC_API_KEY` (optional until AI features land). Keys live only in Render, never in the repo.
4. Every push to `main` redeploys automatically.

Free-tier servers sleep after ~15 minutes of no traffic, so the first visit after that takes ~30–50 seconds to wake up.

## Project layout

```
client/   React + Vite front end
server/   Node + Express + Socket.IO game server
shared/   Types shared by both (socket events, game state)
```
