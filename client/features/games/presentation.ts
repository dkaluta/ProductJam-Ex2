import type { Player } from "@shared/game/types";

/** Friendly display names; the API continues to store X and O. */
export function playerName(player: Player | null) {
  return player === "X" ? "Cross" : player === "O" ? "Circle" : "";
}

import type { Game } from "@shared/schemas/games";
import { LANG } from "../../lib/config";

const dateFormat = new Intl.DateTimeFormat(LANG, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatGameDate(date: string) {
  return dateFormat.format(new Date(date));
}
export function gameTitle(game: Game) {
  return `Game ${game.id.slice(0, 6)}`;
}
export function gameStatus(game: Game) {
  return game.outcome === "in_progress"
    ? `In progress · ${playerName(game.turn)}'s turn`
    : game.outcome === "draw"
      ? "Draw"
      : `${playerName(game.winner)} won`;
}
