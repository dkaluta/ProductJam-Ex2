import { getAllWinningLinesForPlayer, getPieceCounts } from "./board";
import type { Board, Cell } from "./types";

/**
 * Validates whether an arbitrary 4x4 board is a legal state reachable from INITIAL_GAME.
 */
export const isValidBoard = (board: Board): boolean => {
  const { xCount, oCount } = getPieceCounts(board);
  const diff = xCount - oCount;

  // Turn count invariant: X starts first, diff must be 0 or 1
  if (diff !== 0 && diff !== 1) return false;

  const xLines = getAllWinningLinesForPlayer(board, "X");
  const oLines = getAllWinningLinesForPlayer(board, "O");
  const xWon = xLines.length > 0;
  const oWon = oLines.length > 0;

  // Mutual exclusivity: both cannot win
  if (xWon && oWon) return false;

  // Winner must have made the last move
  if (xWon && diff !== 1) return false;
  if (oWon && diff !== 0) return false;

  // If a player won, check that all completed lines share a common cell
  // that could have been placed as the single winning move
  const winnerLines = xWon ? xLines : oLines;
  const winner = xWon ? "X" : "O";

  if (winnerLines.length > 1) {
    const candidates = winnerLines[0].filter((pos) =>
      winnerLines.every((line) => line.includes(pos)),
    );

    const validCandidateFound = candidates.some((pos) => {
      const copy = [...board] as Cell[];
      copy[pos] = null;
      return (
        getAllWinningLinesForPlayer(copy as unknown as Board, winner).length ===
        0
      );
    });

    if (!validCandidateFound) return false;
  }

  return true;
};
