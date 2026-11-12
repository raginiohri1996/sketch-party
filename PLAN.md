# Sketch-and-Guess Party Game — Build Plan

> **Status (2026-11-12): all V1 phases (0–8) are built.** Deferred ideas (game modes, gallery/GIFs, mobile layout, chat, vote-kick) are listed below for V2.

Working title TBD (avoid "draw.io" — existing product).

**Audience:** friends & office teams (desktop browsers).
**Core loop:** one player draws an AI-provided word, others guess; faster guesses = more points.
A round = every player draws once. Multiple rounds, timed turns.

---

## V1 scope

| In V1 | Deferred |
|---|---|
| 2D / 2.5D avatar builder on home screen (body type, skin, hair, outfit, accessories, colors) + name | Game modes: Imposter, Telephone, Teams, Beat-the-AI as a mode |
| No signup, rooms via 4-letter code / invite link | Gallery, timelapse GIFs, awards, emoji reactions |
| Classic loop: pick 1 of 3 words, draw, guess, speed scoring | Mobile layout |
| Hint economy: emoji, vague→specific clues, category, sound, wildcard; hints lower max points, drawer bonus for fewer hints | Free chat |
| "You're close!" private warm signal | Vote-kick |
| Round modifiers (One Line, Flashlight, Mirror, Three Colors, Limited Ink, Shaky Hand, Speed Round) | |
| Sabotage coins (ink splat, tiny brush, canvas freeze) | |
| AI players fill empty seats — solo play supported (AI guesses + AI draws) | |
| Pre-generated word/hint packs (no per-turn LLM cost), bring-your-own API key | |
| Player-name filter | |
| Hosted live URL + README | |

## Visual direction

**Vibe: "Game night" — playful, but for adults at the office.** Party-game-show energy after work, never kindergarten.

- **Color:** dark ink/navy base (`#141327`) with bright pops: coral `#ff6b5b`, lime `#c6f432`, violet `#8b6cff`, tangerine `#ffa53d`. Each player gets an accent color.
- **Surfaces:** frosted-glass cards, ~18px corners, pill buttons. A few soft glowing orbs drift in the background (subtle, not bubbly).
- **Type:** headings in **Bricolage Grotesque** (bold, quirky), body in **DM Sans** (Google Fonts).
- **Emoji:** **Microsoft Fluent Emoji, Flat style** (MIT), used for hints, reactions and icons. Same look on every computer.
- **Characters:** adult, modern flat illustration. Head ≈ ⅕ of height, necks, shoulders, longer legs. Small eyes with eyebrows, a nose, subtle mouths; blush optional (off by default). Office-casual wardrobe (blazer, shirt, turtleneck, sweater, hoodie, tee, dress, jumpsuit) plus beard/mustache, earrings, coffee mug, ID lanyard.
- **Copy:** witty office humor (e.g. names like "Chief Doodle Officer", "Per My Last Sketch").
- **Motion:** snappy and springy, not squishy-cute. Buttons press down, cards slide in, confetti on correct guesses. Respect "reduce motion" settings.

_Changed 2026-11-12: first pass (candy pastels, chibi characters, Fredoka) read as a kids' game._

## Stack

- **Client:** Vite + React + TypeScript, HTML canvas, SVG-layered avatars (2.5D)
- **Server:** Node + TypeScript + Socket.IO (in-memory rooms for V1)
- **Shared:** `shared/` package for event + state types
- **AI:** Claude API — content pipeline (offline) and AI players (vision guessing, stroke drawing)
- **Deploy:** GitHub repo → **Render** web service (free tier), auto-deploys on every push to `main`.
  One Node service serves both the built client and the Socket.IO server, so colleagues get one URL.
  GitHub Pages alone can't host this — it only serves static files, and multiplayer needs a live server.
  AI API key lives only in Render environment variables — never in the repo or client code.

---

## Phases (one session each)

### Phase 0 — Project scaffold
- Monorepo: `client/`, `server/`, `shared/`, npm workspaces
- Dev scripts, `.claude/launch.json`, lint/format, `git init`, `.env.example` (no secrets committed)
- Production build: server serves the built client; `render.yaml` blueprint
- Push to GitHub, connect Render once → first live URL (even if it only says "connected")
- **Done when:** client and server run locally AND the Render URL loads and shows "connected"

### Phase 1 — Home screen & avatar builder
- Layered SVG avatar: body type A/B, skin tone, hair, top, bottom, shoes, accessory, colors — any mix
- 2.5D feel: drag-to-turn (front / ¾ / side views), idle bob, celebrate animation on change
- Name input + filter; profile saved in localStorage
- **Done when:** a player can build an avatar, name it, and it persists on reload

### Phase 2 — Rooms & lobby
- Create room / join by code / invite link
- Lobby shows avatars; host settings: rounds, turn time, AI player count, hints on/off, modifiers on/off, sabotage on/off
- Reconnect handling, host migration if host leaves
- **Done when:** 2+ browser tabs can join one room and see each other

### Phase 3 — Core game loop
- Turn order, word choice (1 of 3), real-time stroke sync (brush sizes, colors, eraser, undo, clear)
- Timer, guess input, correct-guess detection (case/spacing tolerant), speed-based scoring, drawer points
- Turn → round → game over flow, final scoreboard with avatars
- **Done when:** a full multi-round game plays start to finish with humans

> **Built 2026-11-12 (Phases 4–6):** pack v1 (179 words) was written by Claude directly into `server/src/wordpack.ts` and validated on load
> (no clue may contain its answer); sound hints are synthesized in the browser (`client/src/game/sounds.ts`) instead of CC0 files.
> Sabotage needs 3+ players (with 2, the only guesser getting it right ends the turn). A Claude API regeneration script is optional future work.

### Phase 4 — Content pipeline (word & hint packs)
- Script calls the AI once, offline, to build JSON packs: word, category, difficulty, emoji riddle, 3 tiered clues, sound tag, list of "near" words (for the close-guess signal)
- Curated CC0 sound library mapped to sound tags
- **Done when:** a few hundred validated words ship with the repo; the game uses them

### Phase 5 — Hint economy & close-guess
- Drawer hint deck (3 picks/turn), wildcard hint, sound playback for guessers
- Each hint lowers the guessers' max points; drawer bonus for fewer hints
- Private 🔥 "You're close!" from the precomputed near-word lists (no runtime AI)
- **Done when:** hints change scoring visibly and feel like a choice

### Phase 6 — Round modifiers & sabotage
- Slot-machine modifier reveal at turn start; implement the 7 modifiers
- Coins earned on correct guesses; spend on ink splat / tiny brush / 3s freeze against the next drawer (cooldowns, caps)
- **Done when:** each modifier and sabotage works in a live game

### Phase 7 — AI players (solo play)
- Bot seats with generated avatars, names, small "personalities"
- **AI guesser:** sends canvas snapshots to a vision model at intervals, guesses with human-like timing
- **AI drawer:** model produces simple stroke paths for the word, replayed as animated strokes; uses hints too
- Cost controls: snapshot throttling, per-room budget, BYO key, fallback when no key is set
- **Done when:** one human can play a full game against AI players

### Phase 8 — Polish & ship
- SFX/music, transitions, empty/error states, tutorial tooltip on first game
- Rate limiting, basic abuse protection
- Deploy, README with live link + gameplay GIF, CONTRIBUTING, license
- **Done when:** a stranger can open the link and play within 30 seconds
