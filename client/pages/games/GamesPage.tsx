import { Button, Card, Spinner } from "../../components";
import { AbandonGameDialog } from "../../features/games/AbandonGameDialog";
import { GameActionsDialog } from "../../features/games/GameActionsDialog";
import { GameCollection } from "../../features/games/GameCollection";
import { GameToolbar } from "../../features/games/GameToolbar";
import { GameViewer } from "../../features/games/GameViewer";
import { useGameBrowser } from "../../features/games/useGameBrowser";
import styles from "./GamesPage.module.css";

export default function GamesPage() {
  const { collectionRef, ...browser } = useGameBrowser();
  const { gamesQuery, games, selected, create, abandon } = browser;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Tic-tac-toe</h1>
          <p className={styles.subtitle}>
            Four in a row. Two players. One screen.
          </p>
        </div>
        <Button loading={create.isPending} onClick={browser.createGame}>
          New game
        </Button>
      </header>
      {create.isError ? (
        <p role="alert">
          {create.error.message}{" "}
          <Button variant="ghost" onClick={() => create.reset()}>
            Dismiss
          </Button>
        </p>
      ) : null}
      <GameToolbar
        view={browser.view}
        count={games.length}
        {...browser.menuProps}
        onViewChange={browser.changeView}
      />
      {gamesQuery.isPending ? (
        <div className={styles.message}>
          <Spinner size="lg" />
          <p>Loading games…</p>
        </div>
      ) : gamesQuery.isError ? (
        <Card>
          <p role="alert">Could not load games. {gamesQuery.error.message}</p>
          <Button variant="secondary" onClick={() => void gamesQuery.refetch()}>
            Try again
          </Button>
        </Card>
      ) : !selected ? (
        <div className={styles.message}>
          <h2>
            {browser.filter === "all"
              ? "Your first move awaits"
              : "No games here yet"}
          </h2>
          <p>
            {browser.filter === "all"
              ? "Start a new game. Your progress is saved after every move."
              : "Choose another filter or start a new game."}
          </p>
        </div>
      ) : (
        <GameCollection
          ref={collectionRef}
          games={games}
          selected={selected}
          selectedIndex={browser.selectedIndex}
          view={browser.view}
          menuProps={browser.menuProps}
          select={browser.select}
          activate={browser.activate}
          open={browser.open}
          onAbandon={browser.setAbandon}
          abandonPending={abandon.isPending}
        />
      )}
      <GameActionsDialog
        game={browser.actionGame}
        onClose={browser.dismissActions}
        onOpen={browser.openActionGame}
        onAbandon={browser.abandonActionGame}
      />
      {browser.id ? (
        <GameViewer
          key={browser.id}
          id={browser.id}
          close={browser.close}
          onAbandon={browser.setAbandon}
        />
      ) : null}
      <AbandonGameDialog
        game={browser.abandoning}
        pending={abandon.isPending}
        error={abandon.error}
        onClose={() => browser.setAbandon()}
        onConfirm={browser.confirmAbandon}
      />
    </main>
  );
}
