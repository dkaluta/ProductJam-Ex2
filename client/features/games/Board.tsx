import type { Position } from "@shared/game/types";
import type { Game } from "@shared/schemas/games";
import styles from "./Board.module.css";
import { playerName } from "./presentation";

export function Board({
  game,
  onMove,
  busy = false,
}: {
  game: Game;
  onMove?: (position: Position) => void;
  busy?: boolean;
}) {
  const line = game.winning_line;
  const first = line?.[0];
  const last = line?.[3];
  return (
    <div
      className={styles.board}
      role={onMove ? "group" : "img"}
      aria-label={
        onMove
          ? "Game board, four in a row to win"
          : `Board, rows from top: ${Array.from({ length: 4 }, (_, row) =>
              game.board
                .slice(row * 4, row * 4 + 4)
                .split("")
                .map((mark) =>
                  mark === "_" ? "empty" : playerName(mark as "X" | "O"),
                )
                .join(", "),
            ).join(
              "; ",
            )}${line ? `. ${playerName(game.winner)} wins with four in a row.` : ""}`
      }
    >
      {Array.from({ length: 16 }, (_, index) => {
        const mark = game.board[index];
        const occupied = mark === "X" || mark === "O";
        const className = `${styles.cell} ${mark === "O" ? styles.circle : styles.cross} ${line?.includes(index as Position) ? styles.winner : ""}`;
        return onMove ? (
          <button
            key={index}
            type="button"
            className={className}
            aria-label={`Row ${Math.floor(index / 4) + 1}, column ${(index % 4) + 1}: ${occupied ? playerName(mark as "X" | "O") : "empty"}`}
            disabled={busy || occupied || game.outcome !== "in_progress"}
            onClick={() => onMove(index as Position)}
          >
            {occupied ? <Mark player={mark as "X" | "O"} /> : null}
          </button>
        ) : (
          <span key={index} className={className} aria-hidden="true">
            {occupied ? <Mark player={mark as "X" | "O"} /> : null}
          </span>
        );
      })}
      {first !== undefined && last !== undefined ? (
        <svg className={styles.line} viewBox="0 0 400 400" aria-hidden="true">
          <line
            x1={(first % 4) * 100 + 50}
            y1={Math.floor(first / 4) * 100 + 50}
            x2={(last % 4) * 100 + 50}
            y2={Math.floor(last / 4) * 100 + 50}
          />
        </svg>
      ) : null}
    </div>
  );
}

function Mark({ player }: { player: "X" | "O" }) {
  return (
    <svg
      className={styles.mark}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {player === "X" ? (
        <path d="m11 11 26 26m0-26L11 37" />
      ) : (
        <circle cx="24" cy="24" r="16" />
      )}
    </svg>
  );
}
