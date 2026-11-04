import type { Game } from "@shared/schemas/games";
import { gameTitle, gameStatus as status } from "./presentation";
import { useEffect, type RefObject } from "react";
import { Board } from "./Board";
import { GameMenu, type GameMenuProps } from "./GameMenu";
import { formatGameDate } from "./presentation";
import type { GameView } from "./collection";
import styles from "./GameList.module.css";

export function GameList({
  games,
  selected,
  view,
  menuProps,
  selectedRow,
  list,
  activate,
  select,
}: {
  games: Game[];
  selected: Game;
  view: GameView;
  menuProps: GameMenuProps;
  selectedRow: RefObject<HTMLButtonElement | null>;
  list: RefObject<HTMLUListElement | null>;
  activate: (game: Game) => void;
  select: (index: number) => void;
}) {
  useEffect(() => {
    const row = selectedRow.current;
    const container = list.current;
    if (!row || !container || !container.clientHeight) return;
    const rowBounds = row.getBoundingClientRect();
    const bounds = container.getBoundingClientRect();
    if (rowBounds.top < bounds.top)
      container.scrollBy({ top: rowBounds.top - bounds.top });
    else if (rowBounds.bottom > bounds.bottom)
      container.scrollBy({ top: rowBounds.bottom - bounds.bottom });
  }, [selected.id, view, list, selectedRow]);

  return (
    <div className={styles.gameList} data-standalone={view === "list"}>
      <div className={styles.listHeading}>
        <GameMenu field="name" {...menuProps} />
        <GameMenu field="status" {...menuProps} />
        <GameMenu field="moves" {...menuProps} />
        <span>Started</span>
        <span />
      </div>
      <ul ref={list} className={styles.rows} aria-label="Games">
        {games.map((game, index) => (
          <li
            key={game.id}
            className={styles.row}
            data-selected={selected.id === game.id}
          >
            <button
              type="button"
              className={styles.rowSelect}
              ref={selected.id === game.id ? selectedRow : undefined}
              aria-pressed={selected.id === game.id}
              onClick={() => (view === "list" ? activate(game) : select(index))}
              onDoubleClick={() => activate(game)}
            >
              <span className={styles.rowIdentity}>
                <span className={styles.thumbnail}>
                  <Board game={game} />
                </span>
                <span className={styles.rowName}>
                  {gameTitle(game)}
                  <span className={styles.mobileStatus}>
                    {status(game)} · {game.move_count} moves
                  </span>
                </span>
              </span>
              <span className={styles.rowStatus}>{status(game)}</span>
              <span className={styles.rowMoves}>{game.move_count}</span>
              <time className={styles.rowDate} dateTime={game.created_at}>
                {formatGameDate(game.created_at)}
              </time>
            </button>
            <button
              type="button"
              className={styles.openRow}
              onClick={() => activate(game)}
              aria-label={`${game.outcome === "in_progress" ? "Continue" : "View"} ${gameTitle(game)}`}
            >
              ↗
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
