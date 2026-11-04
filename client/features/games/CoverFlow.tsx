import { useMemo, useState, type CSSProperties } from "react";
import { motion, useTransform, type MotionValue } from "motion/react";
import type { Game } from "@shared/schemas/games";
import { Button, IconButton } from "../../components";
import { Board } from "./Board";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { playerName } from "./presentation";
import { useCoverFlow } from "./useCoverFlow";
import styles from "./CoverFlow.module.css";

// Planes Apple preset. Geometry scales with the board, preserving its ratios.
const APPLE = {
  itemWidth: 400,
  centerGap: 180,
  stackSpacing: 60,
  rotation: 67,
  scrollThreshold: 100,
};
const compactQuery = "(max-height: 600px) and (orientation: landscape)";
export function CoverFlow({
  games,
  index,
  onSelect,
  onOpen,
}: {
  games: Game[];
  index: number;
  onSelect: (index: number) => void;
  onOpen: (game: Game) => void;
}) {
  const compact = useMediaQuery(compactQuery);
  const [audio, setAudio] = useState(true);
  const width = compact ? 160 : 300;
  const ratio = width / APPLE.itemWidth;
  const items = useMemo(
    () =>
      games.map((game) => ({
        id: game.id,
        image: "",
        title: `Game ${game.id.slice(0, 6)}`,
      })),
    [games],
  );
  const {
    activeIndex,
    scale,
    containerRef,
    containerProps,
    goTo,
    handleCardClick,
    effectiveScrollX,
    prefersReducedMotion,
  } = useCoverFlow({
    items,
    itemWidth: width,
    centerGap: APPLE.centerGap * ratio,
    initialIndex: index,
    enableAudio: audio,
    enableClickToSnap: true,
    enableScroll: true,
    scrollThreshold: APPLE.scrollThreshold,
    onIndexChange: onSelect,
    onItemClick: (_item, itemIndex) => onOpen(games[itemIndex]),
  });
  const size = width * scale;
  return (
    <section className={styles.flow} aria-label="Browse games">
      <motion.div
        ref={containerRef}
        {...containerProps}
        className={styles.stage}
        style={{ "--card-size": `${size}px` } as CSSProperties}
        aria-label="Game previews. Use arrow keys to browse and Enter to open."
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            goTo(event.key === "Home" ? 0 : games.length - 1);
          } else containerProps.onKeyDown(event);
        }}
      >
        {games.map((game, itemIndex) =>
          Math.abs(itemIndex - activeIndex) > 6 ? null : (
            <GameCover
              key={game.id}
              game={game}
              index={itemIndex}
              active={itemIndex === activeIndex}
              scroll={effectiveScrollX}
              size={size}
              ratio={ratio * scale}
              reduced={prefersReducedMotion}
              onOpen={() => handleCardClick(items[itemIndex], itemIndex)}
            />
          ),
        )}
      </motion.div>
      <div className={styles.navigation}>
        <Button
          variant="ghost"
          onClick={() => goTo(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label="Previous game"
        >
          ←
        </Button>
        <span aria-live="polite" aria-atomic="true">
          {activeIndex + 1} / {games.length}
        </span>
        <Button
          variant="ghost"
          onClick={() => goTo(activeIndex + 1)}
          disabled={activeIndex === games.length - 1}
          aria-label="Next game"
        >
          →
        </Button>
        <IconButton
          label={audio ? "Mute navigation sounds" : "Enable navigation sounds"}
          aria-pressed={audio}
          onClick={() => setAudio(!audio)}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M4 9h4l5-4v14l-5-4H4V9Z" />
            {audio ? (
              <path d="M17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
            ) : (
              <path d="m17 9 5 6m0-6-5 6" />
            )}
          </svg>
        </IconButton>
      </div>
    </section>
  );
}

function GameCover({
  game,
  index,
  active,
  scroll,
  size,
  ratio,
  reduced,
  onOpen,
}: {
  game: Game;
  index: number;
  active: boolean;
  scroll: MotionValue<number>;
  size: number;
  ratio: number;
  reduced: boolean;
  onOpen: () => void;
}) {
  const x = useTransform(scroll, (value) => {
    const offset = index - value;
    const distance = Math.abs(offset);
    return distance < 1
      ? offset * APPLE.centerGap * ratio
      : Math.sign(offset) *
          (APPLE.centerGap + (distance - 1) * APPLE.stackSpacing) *
          ratio;
  });
  const rotateY = useTransform(scroll, (value) => {
    if (reduced) return 0;
    const offset = index - value;
    return Math.abs(offset) < 0.5
      ? -offset * APPLE.rotation * 2
      : -Math.sign(offset) * APPLE.rotation;
  });
  const z = useTransform(scroll, (value) =>
    reduced
      ? 0
      : Math.abs(index - value) > 0.5
        ? -200
        : Math.abs(index - value) * -400,
  );
  const zIndex = useTransform(
    scroll,
    (value) => 1000 - Math.abs(index - value) * 10,
  );
  const dim = useTransform(scroll, (value) =>
    Math.abs(index - value) < 0.5 ? 0 : 0.35,
  );
  return (
    <motion.div
      className={styles.cover}
      style={{
        width: size,
        marginInlineStart: -size / 2,
        x,
        z,
        rotateY,
        zIndex,
      }}
    >
      <motion.button
        type="button"
        className={styles.face}
        tabIndex={-1}
        data-active={active}
        aria-label={`${active ? "Open" : "Select"} game ${game.id.slice(0, 6)}`}
        onTap={onOpen}
      >
        <Board game={game} />
        <span className={styles.coverStatus}>
          {game.outcome === "in_progress"
            ? "● In progress"
            : game.outcome === "draw"
              ? "Draw"
              : `${playerName(game.winner)} won`}
        </span>
        <motion.span className={styles.dim} style={{ opacity: dim }} />
      </motion.button>
      <div className={styles.reflection} aria-hidden="true">
        <div className={styles.reflectedBoard}>
          <Board game={game} />
        </div>
      </div>
    </motion.div>
  );
}
