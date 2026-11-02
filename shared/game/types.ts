export type Player = "X" | "O";
export type Cell = Player | null;

export type Position =
  0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export type Line = readonly [Position, Position, Position, Position];

export type Board = readonly [
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
];

export type GameStatus =
  | { readonly status: "in_progress"; readonly turn: Player }
  | {
      readonly status: "game_won";
      readonly winner: Player;
      readonly line: Line;
    }
  | { readonly status: "draw" };

export interface GameState {
  readonly board: Board;
  readonly status: GameStatus;
}

export type MoveAction = {
  readonly type: "MAKE_MOVE";
  readonly position: Position;
};

export type ResetAction = {
  readonly type: "RESET";
};

export type GameAction = MoveAction | ResetAction;

export type MoveError =
  "GAME_ALREADY_FINISHED" | "CELL_OCCUPIED" | "INVALID_POSITION";

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
