import type { Game } from "@shared/schemas/games";
import { gameTitle } from "./presentation";

export type GameView = "list" | "covers" | "flow";
export type GameSort =
  | "newest"
  | "name_asc"
  | "name_desc"
  | "status_asc"
  | "status_desc"
  | "moves_asc"
  | "moves_desc";

/** Preserve server data and apply the same ordering to all collection views. */
export function getVisibleGames(
  source: readonly Game[],
  filter: string,
  sort: string,
  locale: string,
): Game[] {
  const games = source.filter((game) =>
    filter === "in_progress"
      ? game.outcome === "in_progress"
      : filter === "completed"
        ? game.outcome !== "in_progress"
        : filter === "game_won" || filter === "draw"
          ? game.outcome === filter
          : true,
  );
  games.sort((a, b) => {
    const direction = sort.endsWith("desc") ? -1 : 1;
    const ranks = { in_progress: 0, game_won: 1, draw: 2 };
    const compared = sort.startsWith("name_")
      ? gameTitle(a).localeCompare(gameTitle(b), locale, { numeric: true })
      : sort.startsWith("moves_")
        ? a.move_count - b.move_count
        : sort.startsWith("status_")
          ? ranks[a.outcome] - ranks[b.outcome]
          : 0;
    return (
      direction * compared ||
      b.created_at.localeCompare(a.created_at) ||
      a.id.localeCompare(b.id)
    );
  });
  return games;
}
