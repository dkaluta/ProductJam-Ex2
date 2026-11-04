import { findWinningLine, isBoardFull } from "./board";
import type {
  Board,
  GameState,
  GameStatus,
  MoveAction,
  MoveError,
  Player,
  Result,
} from "./types";

export const getNextPlayer = (current: Player): Player =>
  current === "X" ? "O" : "X";

export const evaluateState = (
  board: Board,
  currentTurn: Player,
): GameStatus => {
  const win = findWinningLine(board);
  if (win) {
    return { status: "game_won", winner: win.winner, line: win.line };
  }
  if (isBoardFull(board)) {
    return { status: "draw" };
  }
  return { status: "in_progress", turn: currentTurn };
};

export const makeMove = (
  state: GameState,
  action: MoveAction,
): Result<GameState, MoveError> => {
  if (state.status.status !== "in_progress") {
    return { ok: false, error: "GAME_ALREADY_FINISHED" };
  }

  const { position } = action;
  if (!Number.isInteger(position) || position < 0 || position > 15) {
    return { ok: false, error: "INVALID_POSITION" };
  }

  if (state.board[position] !== null) {
    return { ok: false, error: "CELL_OCCUPIED" };
  }

  const activePlayer = state.status.turn;

  const nextBoard = [
    ...state.board.slice(0, position),
    activePlayer,
    ...state.board.slice(position + 1),
  ] as unknown as Board;

  const nextStatus = evaluateState(nextBoard, getNextPlayer(activePlayer));

  return {
    ok: true,
    value: {
      board: nextBoard,
      status: nextStatus,
    },
  };
};
