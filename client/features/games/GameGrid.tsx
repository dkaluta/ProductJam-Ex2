import type { Game } from "@shared/schemas/games";
import { gameTitle, gameStatus as status } from "./presentation";
import type { RefObject } from "react";
import { Board } from "./Board";
import styles from "./GameGrid.module.css";

export function GameGrid({
  games,
  selected,
  selectedArt,
  activate,
}: {
  games: Game[];
  selected: Game;
  selectedArt: RefObject<HTMLButtonElement | null>;
  activate: (game: Game) => void;
}) {
  return (
    <ul className={styles.artGrid} aria-label="Game cover art">
      {games.map((game) => (
        <li key={game.id}>
          <button
            type="button"
            className={styles.artCard}
            ref={game.id === selected.id ? selectedArt : undefined}
            onClick={() => activate(game)}
            aria-label={`${game.outcome === "in_progress" ? "Continue" : "View"} ${gameTitle(game)}: ${status(game)}`}
          >
            <Board game={game} />
            <span className={styles.artTitle}>{gameTitle(game)}</span>
            <span className={styles.artStatus}>{status(game)}</span>
            <span className={styles.artStatus}>{game.move_count} moves</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
