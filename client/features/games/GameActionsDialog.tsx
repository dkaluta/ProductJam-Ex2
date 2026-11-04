import type { Game } from "@shared/schemas/games";
import { gameTitle, gameStatus as status } from "./presentation";
import { Dialog } from "../../components";
import { Board } from "./Board";
import styles from "./GameActionsDialog.module.css";

export function GameActionsDialog({
  game: actionGame,
  onClose: dismissActions,
  onOpen,
  onAbandon,
}: {
  game: Game | undefined;
  onClose: () => void;
  onOpen: (game: Game) => void;
  onAbandon: (game: Game) => void;
}) {
  return (
    <Dialog
      open={Boolean(actionGame)}
      onOpenChange={(isOpen) => {
        if (!isOpen) dismissActions();
      }}
      className={styles.gameActions}
      title={actionGame ? gameTitle(actionGame) : "Game actions"}
      description={
        actionGame
          ? `${status(actionGame)} · ${actionGame.move_count} moves`
          : undefined
      }
    >
      {actionGame ? (
        <>
          <div className={styles.actionThumbnail}>
            <Board game={actionGame} />
          </div>
          <div className={styles.actionRows}>
            <button
              type="button"
              onClick={() => {
                onOpen(actionGame);
              }}
            >
              {actionGame.outcome === "in_progress"
                ? "Continue game"
                : "View finished game"}
              <span aria-hidden="true">→</span>
            </button>
            {actionGame.outcome === "in_progress" ? (
              <button
                type="button"
                onClick={() => {
                  onAbandon(actionGame);
                }}
              >
                Abandon game…<span aria-hidden="true">×</span>
              </button>
            ) : null}
            <button type="button" onClick={dismissActions}>
              Back to collection<span aria-hidden="true">↩</span>
            </button>
          </div>
        </>
      ) : null}
    </Dialog>
  );
}
