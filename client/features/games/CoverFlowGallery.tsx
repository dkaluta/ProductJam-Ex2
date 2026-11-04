import type { Game } from "@shared/schemas/games";
import { gameTitle, gameStatus as status } from "./presentation";
import type { RefObject } from "react";
import { Button } from "../../components";
import { CoverFlow } from "./CoverFlow";
import styles from "./CoverFlowGallery.module.css";

export function CoverFlowGallery({
  games,
  selected,
  selectedIndex,
  select,
  activate,
  open,
  openButton,
  abandonPending,
  onAbandon,
}: {
  games: Game[];
  selected: Game;
  selectedIndex: number;
  select: (index: number) => void;
  activate: (game: Game) => void;
  open: (game: Game) => void;
  openButton: RefObject<HTMLButtonElement | null>;
  abandonPending: boolean;
  onAbandon: (game: Game) => void;
}) {
  return (
    <div className={styles.coverArea}>
      <CoverFlow
        games={games}
        index={selectedIndex}
        onSelect={select}
        onOpen={activate}
      />
      <div className={styles.selection}>
        <div className={styles.caption} aria-live="polite" aria-atomic="true">
          <h2>{gameTitle(selected)}</h2>
          <p>
            <span
              className={
                selected.outcome === "in_progress"
                  ? styles.activeStatus
                  : undefined
              }
            >
              {status(selected)}
            </span>{" "}
            · {selected.move_count} moves
          </p>
        </div>
        <div className={styles.actions}>
          <Button ref={openButton} onClick={() => open(selected)}>
            {selected.outcome === "in_progress" ? "Continue game" : "View game"}
          </Button>
          {selected.outcome === "in_progress" ? (
            <Button
              variant="ghost"
              disabled={abandonPending}
              onClick={() => onAbandon(selected)}
            >
              Abandon…
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
