import { WINNING_LINES } from "./constants";
import type { Board, Line, Player, Position } from "./types";

export const getPieceCounts = (
  board: Board,
): { readonly xCount: number; readonly oCount: number } => {
  let xCount = 0;
  let oCount = 0;
  for (const cell of board) {
    if (cell === "X") xCount++;
    else if (cell === "O") oCount++;
  }
  return { xCount, oCount };
};

export const getAvailableMoves = (board: Board): readonly Position[] => {
  const moves: Position[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      moves.push(i as Position);
    }
  }
  return moves;
};

export const findWinningLine = (
  board: Board,
): { readonly winner: Player; readonly line: Line } | null => {
  for (const line of WINNING_LINES) {
    const [a, b, c, d] = line;
    const cellA = board[a];
    if (
      cellA !== null &&
      cellA === board[b] &&
      cellA === board[c] &&
      cellA === board[d]
    ) {
      return { winner: cellA, line };
    }
  }
  return null;
};

export const isBoardFull = (board: Board): boolean =>
  board.every((cell): cell is Player => cell !== null);

export const getAllWinningLinesForPlayer = (
  board: Board,
  player: Player,
): Line[] =>
  WINNING_LINES.filter(
    ([a, b, c, d]) =>
      board[a] === player &&
      board[b] === player &&
      board[c] === player &&
      board[d] === player,
  );
