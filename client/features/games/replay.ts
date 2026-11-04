import { INITIAL_GAME } from "@shared/game/constants";
import { makeMove } from "@shared/game/transitions";
import type { GameState, Position } from "@shared/game/types";

/** Rebuild a historical position with the same rules as the server. */
export function replayMoves(
  moves: readonly Position[],
  count: number,
): GameState | null {
  const end = Math.min(
    moves.length,
    Math.max(0, Number.isFinite(count) ? Math.trunc(count) : 0),
  );
  let state = INITIAL_GAME;
  for (const position of moves.slice(0, end)) {
    const next = makeMove(state, { type: "MAKE_MOVE", position });
    if (!next.ok) return null;
    state = next.value;
  }
  return state;
}
