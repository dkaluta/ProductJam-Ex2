import { z } from "zod";
import type { Player, Position } from "../game/types";

/** The server-owned representation returned by the games API. */
export interface Game {
  id: string;
  owner_id: string;
  board: string;
  outcome: "in_progress" | "game_won" | "draw";
  turn: Player | null;
  winner: Player | null;
  winning_line: Position[] | null;
  moves: Position[];
  move_count: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// Unknown fields are discarded: no client-supplied ownership or game state.
export const createGameSchema = z.object({});
export const gameIdSchema = z.object({ id: z.uuid() });
export const moveSchema = z.object({
  position: z.number().int().min(0).max(15),
});
export const listGamesSchema = z.object({
  outcome: z.enum(["in_progress", "completed"]).optional(),
});
