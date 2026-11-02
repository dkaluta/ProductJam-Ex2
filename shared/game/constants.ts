import type { GameState, Line } from "./types";

export const WINNING_LINES: readonly Line[] = [
  // Rows
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [8, 9, 10, 11],
  [12, 13, 14, 15],
  // Columns
  [0, 4, 8, 12],
  [1, 5, 9, 13],
  [2, 6, 10, 14],
  [3, 7, 11, 15],
  // Diagonals
  [0, 5, 10, 15],
  [3, 6, 9, 12],
];

export const INITIAL_GAME: GameState = {
  board: [
    null, null, null, null,
    null, null, null, null,
    null, null, null, null,
    null, null, null, null
  ],
  status: { status: "in_progress", turn: "X" },
};
