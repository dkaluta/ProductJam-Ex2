import { IconButton, Tooltip } from "../../components";
import { GameMenu, type GameMenuProps } from "./GameMenu";
import type { GameView } from "./collection";
import styles from "./GameToolbar.module.css";

export function GameToolbar({
  view,
  filter,
  count,
  onViewChange,
  ...menuProps
}: {
  view: GameView;
  count: number;
  onViewChange: (value: GameView) => void;
} & GameMenuProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.filters} role="group" aria-label="Filter games">
        {(
          [
            ["all", "All games"],
            ["in_progress", "In progress"],
            ["completed", "Completed"],
          ] as const
        ).map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-pressed={filter === value}
            className={styles.filter}
            onClick={() => menuProps.onFilter(value)}
          >
            {label}
          </button>
        ))}
        {filter === "game_won" || filter === "draw" ? (
          <button
            type="button"
            className={styles.filter}
            aria-pressed="true"
            aria-label={`Clear ${filter === "game_won" ? "wins" : "draws"} filter`}
            onClick={() => menuProps.onFilter("all")}
          >
            {filter === "game_won" ? "Wins" : "Draws"} ×
          </button>
        ) : null}
      </div>
      <span className={styles.count}>
        {count} {count === 1 ? "game" : "games"}
      </span>
      <GameMenu filter={filter} {...menuProps} />
      <div className={styles.views} role="group" aria-label="Game view">
        {(
          [
            ["list", "List"],
            ["covers", "Cover art"],
            ["flow", "Cover Flow"],
          ] as const
        ).map(([value, label]) => (
          <Tooltip key={value} content={label}>
            <IconButton
              label={label}
              title={undefined}
              className={styles.viewButton}
              aria-pressed={view === value}
              onClick={() => onViewChange(value)}
            >
              <ViewIcon view={value} />
            </IconButton>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
function ViewIcon({ view }: { view: "list" | "covers" | "flow" }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {view === "list" ? (
        <path d="M5 6h15M5 12h15M5 18h15M2 6h.01M2 12h.01M2 18h.01" />
      ) : view === "covers" ? (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </>
      ) : (
        <>
          <rect x="8" y="4" width="8" height="16" rx="1" />
          <path d="m5 6-3 1v10l3 1V6Zm14 0 3 1v10l-3 1V6Z" />
        </>
      )}
    </svg>
  );
}
