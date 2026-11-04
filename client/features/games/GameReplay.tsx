import { useEffect, useState } from "react";
import type { Game } from "@shared/schemas/games";
import { Button, IconButton } from "../../components";
import { Board } from "./Board";
import { playerName } from "./presentation";
import { replayMoves } from "./replay";
import styles from "./GameReplay.module.css";

export function GameReplay({ game }: { game: Game }) {
  const total = game.moves.length;
  const [step, setStep] = useState(total);
  const [playing, setPlaying] = useState(false);
  const state = replayMoves(game.moves, step);

  useEffect(() => {
    if (!playing || step >= total) return;
    const timer = window.setTimeout(() => {
      setStep(step + 1);
      if (step + 1 >= total) setPlaying(false);
    }, 850);
    return () => window.clearTimeout(timer);
  }, [playing, step, total]);

  function goTo(next: number) {
    setPlaying(false);
    setStep(Math.max(0, Math.min(total, next)));
  }

  if (!state)
    return (
      <>
        <Board game={game} />
        <p role="alert">
          This game’s saved move history could not be replayed. The final board
          is still available.
        </p>
      </>
    );

  const lastPosition = game.moves[step - 1];
  const lastPlayer = step % 2 === 1 ? "X" : "O";
  const { status } = state;
  const frame: Game = {
    ...game,
    board: state.board.map((cell) => cell ?? "_").join(""),
    outcome: status.status,
    turn: status.status === "in_progress" ? status.turn : null,
    winner: status.status === "game_won" ? status.winner : null,
    winning_line: status.status === "game_won" ? [...status.line] : null,
  };

  return (
    <section aria-label="Game replay" className={styles.replay}>
      <div className={styles.board}>
        <Board game={frame} />
      </div>
      <p
        className={styles.position}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {step === 0
          ? "Starting board. Cross plays first."
          : status.status === "game_won"
            ? `${playerName(status.winner)} wins with four in a row.`
            : status.status === "draw"
              ? "A draw. Every square played."
              : `${playerName(lastPlayer)} placed at row ${Math.floor(lastPosition / 4) + 1}, column ${(lastPosition % 4) + 1}.`}
      </p>
      <div
        className={styles.controls}
        role="group"
        aria-label="Replay controls"
      >
        <IconButton
          label="Go to start"
          disabled={step === 0}
          onClick={() => goTo(0)}
        >
          <TransportIcon kind="first" />
        </IconButton>
        <IconButton
          label="Previous move"
          disabled={step === 0}
          onClick={() => goTo(step - 1)}
        >
          <TransportIcon kind="previous" />
        </IconButton>
        <Button
          variant="secondary"
          disabled={total === 0}
          onClick={() => {
            if (playing) setPlaying(false);
            else {
              if (step >= total) setStep(0);
              setPlaying(true);
            }
          }}
        >
          {playing
            ? "Pause replay"
            : step >= total
              ? "Replay game"
              : "Play replay"}
        </Button>
        <IconButton
          label="Next move"
          disabled={step === total}
          onClick={() => goTo(step + 1)}
        >
          <TransportIcon kind="next" />
        </IconButton>
        <IconButton
          label="Go to final board"
          disabled={step === total}
          onClick={() => goTo(total)}
        >
          <TransportIcon kind="last" />
        </IconButton>
      </div>
      <label className={styles.timeline}>
        <span>
          Move {step} of {total}
        </span>
        <input
          type="range"
          min={0}
          max={total}
          step={1}
          value={step}
          disabled={total === 0}
          aria-label="Replay move"
          aria-valuetext={`Move ${step} of ${total}`}
          onChange={(event) => goTo(Number(event.target.value))}
        />
      </label>
    </section>
  );
}

function TransportIcon({
  kind,
}: {
  kind: "first" | "previous" | "next" | "last";
}) {
  const back = kind === "first" || kind === "previous";
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={back ? "m15 5-8 7 8 7" : "m9 5 8 7-8 7"} />
      {kind === "first" ? (
        <path d="M4 5v14" />
      ) : kind === "last" ? (
        <path d="M20 5v14" />
      ) : null}
    </svg>
  );
}
