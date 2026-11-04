import type { Game } from "@shared/schemas/games";
import { gameTitle, gameStatus as status } from "./presentation";
import { Button, Dialog, Spinner } from "../../components";
import { Board } from "./Board";
import { GameReplay } from "./GameReplay";
import { useGame, useGameActions } from "./hooks";
import { playerName } from "./presentation";
import styles from "./GameViewer.module.css";

export function GameViewer({
  id,
  close,
  onAbandon,
}: {
  id: string;
  close: () => void;
  onAbandon: (game: Game) => void;
}) {
  const query = useGame(id);
  const { move } = useGameActions();
  const game = query.data;
  const playing = game?.outcome === "in_progress";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      size="md"
      title={game ? gameTitle(game) : "Game"}
      description={
        game
          ? `${status(game)} · ${game.move_count} moves${playing ? ". Moves are saved automatically." : ". Finished game preview."}`
          : "Loading game…"
      }
      footer={
        <>
          {playing && game ? (
            <Button
              variant="ghost"
              disabled={move.isPending}
              onClick={() => onAbandon(game)}
            >
              Abandon…
            </Button>
          ) : null}
          <Button variant="secondary" onClick={close}>
            Back to games
          </Button>
        </>
      }
    >
      {query.isPending ? (
        <div className={styles.viewerLoading}>
          <Spinner />
        </div>
      ) : query.isError ? (
        <div role="alert">
          <p>{query.error.message}</p>
          <Button onClick={() => void query.refetch()}>Try again</Button>
        </div>
      ) : game && !playing ? (
        <GameReplay key={game.id} game={game} />
      ) : game ? (
        <>
          <div className={styles.viewerBoard}>
            <Board
              game={game}
              busy={move.isPending || query.isFetching}
              onMove={
                playing
                  ? (position) => move.mutate({ id, position })
                  : undefined
              }
            />
          </div>
          <p className={styles.saveStatus} role="status">
            {move.isPending
              ? "Saving move…"
              : query.isFetching
                ? "Checking latest moves…"
                : playing
                  ? `${playerName(game.turn)}, choose an empty square.`
                  : game.outcome === "game_won"
                    ? `${playerName(game.winner)} wins with four in a row.`
                    : "A draw. Every square played."}
          </p>
          {move.isError ? (
            <p role="alert">
              {move.error.message} The board is refreshed before your next move.
            </p>
          ) : null}
        </>
      ) : null}
    </Dialog>
  );
}
