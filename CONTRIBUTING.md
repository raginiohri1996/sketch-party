# Contributing to Sketch Party

Thanks for helping! Small, focused pull requests are easiest to review.

## Getting started

```bash
npm install
npm run dev        # client on http://localhost:5173, server on :3001
npm run typecheck  # all workspaces
```

With the dev server running:

```bash
npm run smoke -w server       # rooms
npm run smoke:game -w server  # a full game
```

Note: editing anything in `server/` or `shared/` restarts the dev server, which ends games in progress (rooms live in memory).

## Good first contributions

- **Words.** Add lines to `server/src/wordpack.ts`. The format is documented at the top of the file. The server checks the pack when it starts and refuses a clue that gives away its answer. Keep words office-friendly and drawable.
- **Sounds.** New sound hints are small recipes in `client/src/game/sounds.ts`; add the id to `SOUND_IDS` in `shared/src/game.ts` too.
- **Twists and sabotage.** Defined in `shared/src/game.ts`, enforced in `server/src/rooms.ts`, drawn in `client/src/game/Canvas.tsx`.
- **Avatar options.** Options live in `shared/src/avatar.ts`; drawings in `client/src/avatar/Avatar.tsx`. Open `/?angle=90` to freeze the avatar at an angle and check your art from every side.

## Guidelines

- The server decides everything that affects fairness (timers, guesses, points, twists). Don't trust the browser.
- Keep the look consistent: dark glass, rounded, playful but grown-up.
- Keep it accessible: visible keyboard focus, labels on icon buttons, respect "reduce motion".
- Run `npm run typecheck` and both smoke tests before opening a pull request.
