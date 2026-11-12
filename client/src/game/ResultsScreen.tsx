import { useEffect } from "react";
import type { RoomState } from "@sketch/shared";
import { sfx } from "./sounds";
import { Avatar } from "../avatar/Avatar";
import type { RoomApi } from "../room/useRoom";
import { Emoji, type EmojiName } from "../ui/Emoji";
import { TopBar } from "../ui/TopBar";

type Props = { room: RoomState; myId: string; api: RoomApi; online: number | null };

const MEDALS: EmojiName[] = ["1st place medal", "2nd place medal", "3rd place medal"];

export function ResultsScreen({ room, myId, api, online }: Props) {
  const scores = room.game?.scores ?? {};
  const ranked = room.players.filter((p) => p.id in scores).sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const isHost = room.players.find((p) => p.id === myId)?.isHost;
  // Show 2nd, 1st, 3rd so the winner stands in the middle.
  const order = [podium[1], podium[0], podium[2]];
  const iWon = podium[0]?.id === myId;
  useEffect(() => {
    (iWon ? sfx.win : sfx.reveal)();
  }, [iWon]);

  return (
    <div className="home">
      <TopBar online={online}>
        <button className="btn btn--ghost btn--sm" onClick={api.leave}>
          Leave room
        </button>
      </TopBar>

      <main className="glass glass--clear results">
        <h1 className="results__title">
          <Emoji name="Trophy" size={34} /> {podium[0] ? `${podium[0].name} wins!` : "Game over"}
        </h1>

        <div className="podium">
          {order.map((p, slot) =>
            p ? (
              <div key={p.id} className={`podium__spot podium__spot--${slot === 1 ? 1 : slot === 0 ? 2 : 3} ${p.id === myId ? "podium__spot--me" : ""}`}>
                <Avatar config={p.avatar} className="podium__avatar" title={p.name} />
                <div className="podium__block">
                  <Emoji name={MEDALS[slot === 1 ? 0 : slot === 0 ? 1 : 2]!} size={30} />
                  <span className="podium__name">{p.name}</span>
                  <span className="podium__pts">{scores[p.id] ?? 0} pts</span>
                </div>
              </div>
            ) : (
              <div key={slot} className="podium__spot podium__spot--empty" />
            ),
          )}
        </div>

        {rest.length > 0 && (
          <ol className="results__rest" start={4}>
            {rest.map((p, i) => (
              <li key={p.id} className={p.id === myId ? "results__me" : ""}>
                <span className="results__rank">{i + 4}</span>
                <Avatar config={p.avatar} crop="head" className="results__avatar" />
                <span className="results__name">{p.name}</span>
                <span className="results__pts">{scores[p.id] ?? 0}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="results__actions">
          {isHost ? (
            <button className="btn btn--primary" onClick={api.backToLobby}>
              Play again
            </button>
          ) : (
            <p className="waiting">
              <Emoji name="Hourglass not done" size={18} /> Waiting for the host to start a new game
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
