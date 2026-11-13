// Full-game smoke test: `npm run smoke:game -w server` while the dev server runs (~50 seconds).
// Three fake players play a 2-round game: pick words, draw, guess wrong and right, score, finish, back to lobby.
import { io, type Socket } from "socket.io-client";
import { randomAvatar, type PrivateGame, type RoomState, type Stroke } from "@sketch/shared";

const URL = process.env.SERVER_URL ?? "http://localhost:3001";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? `  (${extra})` : ""}`);
  if (!cond) failures++;
};

type Bot = { name: string; s: Socket; state: RoomState | null; priv: PrivateGame; strokes: Stroke[]; id: string; nudges: string[] };
function bot(name: string): Bot {
  const s = io(URL, { transports: ["websocket"], forceNew: true });
  const b: Bot = { name, s, state: null, priv: { options: null, word: null, hintsAvailable: null }, strokes: [], id: "", nudges: [] };
  s.on("room:state", (st: RoomState) => (b.state = st));
  s.on("game:nudge", (t: string) => b.nudges.push(t));
  s.on("game:private", (p: PrivateGame) => (b.priv = p));
  s.on("draw:sync", (all: Stroke[]) => (b.strokes = all));
  s.on("draw:begin", (st: Stroke) => b.strokes.push(st));
  s.on("draw:points", (d: { id: string; points: number[] }) => b.strokes.find((x) => x.id === d.id)?.points.push(...d.points));
  return b;
}
const call = <T>(s: Socket, ev: string, ...args: unknown[]) =>
  new Promise<{ ok: boolean; data?: T; error?: string }>((res) => s.emit(ev, ...args, res));
const key = () => `game-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 32);

async function until(cond: () => boolean, ms = 15000) {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) return false;
    await wait(50);
  }
  return true;
}

const [a, b, c] = [bot("Alex"), bot("Bea"), bot("Cy")];
const made = await call<{ code: string; playerId: string }>(a.s, "room:create", { playerKey: key(), profile: { name: a.name, avatar: randomAvatar() } });
a.id = made.data!.playerId;
const code = made.data!.code;
for (const p of [b, c]) {
  const r = await call<{ playerId: string }>(p.s, "room:join", { playerKey: key(), code, profile: { name: p.name, avatar: randomAvatar() } });
  p.id = r.data!.playerId;
}
await call(a.s, "room:settings", { rounds: 2, turnSeconds: 60 });

const early = await call(b.s, "game:start");
check("only the host can start", !early.ok, early.error);
const started = await call(a.s, "game:start");
check("host starts the game", started.ok, started.error);

const everyone = [a, b, c];
let turns = 0;
let sawWrongGuess = false;
let sawStrokeRelay = false;
let leakedWord = false;
let twisted = 0;

while (turns < 6) {
  const ok = await until(() => a.state?.phase === "results" || a.state?.game?.phase === "choosing");
  if (!ok || a.state?.phase === "results") break;
  if (a.state!.game!.modifier) twisted++;
  const drawerId = a.state!.game!.drawerId;
  const drawer = everyone.find((p) => p.id === drawerId)!;
  const guessers = everyone.filter((p) => p !== drawer);

  await until(() => !!drawer.priv.options);
  check(`turn ${turns + 1}: only ${drawer.name} sees word choices`, !!drawer.priv.options && guessers.every((g) => !g.priv.options), drawer.priv.options?.join(" / "));
  drawer.s.emit("game:choose", 1);
  await until(() => !!drawer.priv.word && a.state?.game?.phase === "drawing");
  const word = drawer.priv.word!;
  if (JSON.stringify(guessers.map((g) => g.state)).includes(`"${word}"`)) leakedWord = true;

  drawer.s.emit("draw:begin", { id: `s${turns}`, tool: "pen", color: "#2f6bff", size: 10, points: [0.1, 0.1] });
  drawer.s.emit("draw:points", { id: `s${turns}`, points: [0.2, 0.2, 0.3, 0.25] });
  await wait(150);
  if (guessers.every((g) => g.strokes.find((s) => s.id === `s${turns}`)?.points.length === 6)) sawStrokeRelay = true;

  guessers[0]!.s.emit("game:guess", "definitely not it");
  await wait(150);
  if (a.state?.game?.feed.some((f) => f.kind === "guess" && f.text === "definitely not it")) sawWrongGuess = true;
  await wait(450);

  if (turns === 0) {
    // Hints: the drawer drops two; guessers see them; availability updates privately.
    drawer.s.emit("game:hint", "emoji");
    await wait(100);
    drawer.s.emit("game:hint", "clue");
    await wait(200);
    const hg = a.state!.game!;
    check("hints reach everyone, hintsLeft drops", hg.hints.length === 2 && hg.hints[0]!.kind === "emoji" && hg.hints[1]!.kind === "clue" && hg.hintsLeft === 1, JSON.stringify(hg.hints));
    check("drawer's hint menu updates", drawer.priv.hintsAvailable?.emoji === false && drawer.priv.hintsAvailable?.clue === 2);
    check("clues never contain the answer", !hg.hints.some((h) => h.text.toLowerCase().includes(word.toLowerCase())));
    // Close guess: a plural is "so close", privately, and the text isn't shown to everyone.
    guessers[1]!.s.emit("game:guess", `${word}s`);
    await wait(200);
    check("near-miss gets a private 'So close!'", guessers[1]!.nudges.length === 1 && guessers[0]!.nudges.length === 0, guessers[1]!.nudges[0]);
    check("near-miss text is hidden from others", !a.state!.game!.feed.some((f) => f.text === `${word}s`));
    await wait(450);
  }

  guessers[0]!.s.emit("game:guess", `  ${word.toUpperCase()}! `); // messy but correct
  await wait(500);
  if (turns === 0) {
    check("first correct guess earns 2 coins", a.state!.game!.coins[guessers[0]!.id] === 2);
    guessers[0]!.s.emit("game:sabotage", "hugeBrush");
    await wait(200);
    const sg = a.state!.game!;
    check("sabotage works and costs coins", sg.sabotage?.kind === "hugeBrush" && sg.coins[guessers[0]!.id] === 1);
    guessers[0]!.s.emit("game:sabotage", "holi");
    await wait(150);
    check("only one sabotage per player per turn", a.state!.game!.coins[guessers[0]!.id] === 1);
    drawer.s.emit("draw:begin", { id: "tiny", tool: "pen", color: "#2f6bff", size: 22, points: [0.5, 0.5] });
    await wait(150);
    check("huge brush forces the fat marker", guessers[1]!.strokes.find((s) => s.id === "tiny")?.size === 46);
  }
  guessers[1]!.s.emit("game:guess", word);
  const revealed = await until(() => a.state?.game?.phase === "reveal");
  const g = a.state!.game!;
  check(`turn ${turns + 1}: everyone guessed "${word}", turn ended early`, revealed && g.revealedWord === word && g.guessedIds.length === 2);
  check(`turn ${turns + 1}: faster guesser scored more, drawer scored`, (g.turnPoints[guessers[0]!.id] ?? 0) > (g.turnPoints[guessers[1]!.id] ?? 0) && (g.turnPoints[drawer.id] ?? 0) > 0, JSON.stringify(g.turnPoints));
  turns++;
  await until(() => a.state?.game?.phase !== "reveal" || a.state?.phase === "results", 10000);
}

check("strokes reach the other players", sawStrokeRelay);
check("wrong guesses show in the feed", sawWrongGuess);
check("the word never leaks to guessers before the reveal", !leakedWord);
check("6 turns played (3 players × 2 rounds)", turns === 6, `${turns}`);
check("exactly half the turns had a twist", twisted === 3, `${twisted} of 6`);
await until(() => a.state?.phase === "results");
const scores = a.state?.game?.scores ?? {};
check("game ends on the results screen with scores", a.state?.phase === "results" && Object.values(scores).every((s) => s > 0), JSON.stringify(scores));
a.s.emit("game:lobby");
await until(() => a.state?.phase === "lobby");
check("host takes everyone back to the lobby", b.state?.phase === "lobby");

everyone.forEach((p) => p.s.emit("room:leave"));
console.log(failures ? `\n${failures} check(s) failed` : "\nAll game checks passed");
process.exit(failures ? 1 : 0);
