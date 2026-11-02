import { INITIAL_GAME } from "./constants";
import { makeMove } from "./transitions";
import type { GameAction, GameState } from "./types";

/**
 * Standard reducer suitable for React useReducer or Redux
 */
export const gameReducer = (
  state: GameState,
  action: GameAction,
): GameState => {
  switch (action.type) {
    case "RESET":
      return INITIAL_GAME;
    case "MAKE_MOVE": {
      const result = makeMove(state, action);
      return result.ok ? result.value : state;
    }
    default:
      return state;
  }
};
