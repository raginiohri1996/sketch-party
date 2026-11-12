// Smoke test for rooms: run `npm run smoke -w server` while the dev server is running.
// Simulates several browsers creating, joining, refreshing and leaving a room.
import { io, type Socket } from "socket.io-client";
import { randomAvatar, type RoomState } from "@sketch/shared";

const URL = process.env.SERVER_URL ?? "http://localhost:3001";
const key = () => `smoke-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 32);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? `  (${extra})` : ""}`);
  if (!cond) failures++;
};

function client() {
  const s: Socket = io(URL, { transports: ["websocket"], forceNew: true });
  const box = { s, state: null as RoomState | null };
  s.on("room:state", (st: RoomState) => (box.state = st));
  return box;
}
const call = <T>(s: Socket, ev: string, payload: unknown) =>
  new Promise<{ ok: boolean; data?: T; error?: string }>((res) => s.emit(ev, payload, res));

const hostKey = key();
const host = client();
const created = await call<{ code: string }>(host.s, "room:create", { playerKey: hostKey, profile: { name: "Host Hana", avatar: randomAvatar() } });
check("host creates a room", created.ok, created.data?.code);
const code = created.data!.code;

const guestKey = key();
const guest = client();
const joined = await call(guest.s, "room:join", { playerKey: guestKey, code, profile: { name: "Host Hana", avatar: randomAvatar() } });
await wait(150);
check("guest joins by code", joined.ok);
check("duplicate name gets a number", !!host.state?.players.some((p) => p.name === "Host Hana 2"), host.state?.players.map((p) => p.name).join(", "));

const badName = await call(client().s, "room:join", { playerKey: key(), code, profile: { name: "sh1t head", avatar: {} } });
check("rude name rejected by server", !badName.ok, badName.error);
const badCode = await call(client().s, "room:join", { playerKey: key(), code: "ZZZZ", profile: { name: "Nobody", avatar: {} } });
check("unknown code rejected", !badCode.ok, badCode.error);

const notHost = await call(guest.s, "room:settings", { rounds: 5 });
check("guest can't change settings", !notHost.ok);
await call(host.s, "room:settings", { rounds: 5, aiPlayers: 3, twists: false });
await wait(150);
check("host changes settings", host.state?.settings.rounds === 5 && host.state.settings.twists === false);
check("AI seats appear", host.state?.players.filter((p) => p.isBot).length === 3);

// Guest refreshes: socket drops, a new socket rejoins with the same key.
guest.s.disconnect();
await wait(150);
check("dropped guest shown as disconnected", host.state?.players.find((p) => p.name === "Host Hana 2")?.connected === false);
const guest2 = client();
await call(guest2.s, "room:join", { playerKey: guestKey, code, profile: { name: "Host Hana", avatar: randomAvatar() } });
await wait(150);
const humans = host.state?.players.filter((p) => !p.isBot) ?? [];
check("refresh reclaims the same seat", humans.length === 2 && humans.every((p) => p.connected), humans.map((p) => p.name).join(", "));

// Host leaves on purpose: the crown moves to the guest.
host.s.emit("room:leave");
await wait(150);
check("host leaving hands the crown over", guest2.state?.players.find((p) => !p.isBot)?.isHost === true && guest2.state?.players.filter((p) => !p.isBot).length === 1);

guest2.s.emit("room:leave");
await wait(150);
const rejoin = await call(client().s, "room:join", { playerKey: key(), code, profile: { name: "Late Larry", avatar: {} } });
check("room closes when the last person leaves", !rejoin.ok, rejoin.error);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll room checks passed");
process.exit(failures ? 1 : 0);
