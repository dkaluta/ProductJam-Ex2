import { Hono } from "hono";
import { INITIAL_GAME } from "@shared/game/constants";
import { makeMove } from "@shared/game/transitions";
import type { GameState, Position } from "@shared/game/types";
import {
  createGameSchema,
  gameIdSchema,
  listGamesSchema,
  moveSchema,
} from "@shared/schemas/games";
import type { AppEnv } from "../env";
import { fail, validate } from "../lib/errors";
import { createAdminClient } from "../lib/supabase";

const COLUMNS =
  "id,owner_id,board,outcome,turn,winner,winning_line,moves,move_count,created_at,updated_at,completed_at";

// Replaying the server-owned move history avoids trusting redundant state fields.
function replay(moves: Position[]): GameState {
  let state = INITIAL_GAME;
  for (const position of moves) {
    const result = makeMove(state, { type: "MAKE_MOVE", position });
    if (!result.ok) throw new Error("Invalid stored game history");
    state = result.value;
  }
  return state;
}

export const games = new Hono<AppEnv>()
  .post("/", validate("json", createGameSchema), async (c) => {
    const { data, error } = await createAdminClient(c.env)
      .from("games")
      .insert({ owner_id: c.get("user").id })
      .select(COLUMNS)
      .single();
    if (error)
      return fail(c, 500, "database_error", "Could not create the game.");
    return c.json(data, 201);
  })
  .get("/", validate("query", listGamesSchema), async (c) => {
    const { outcome } = c.req.valid("query");
    let query = createAdminClient(c.env)
      .from("games")
      .select(COLUMNS)
      .eq("owner_id", c.get("user").id);
    if (outcome === "in_progress") query = query.eq("outcome", outcome);
    if (outcome === "completed")
      query = query.in("outcome", ["game_won", "draw"]);
    const { data, error } = await query.order("created_at", {
      ascending: false,
    });
    if (error) return fail(c, 500, "database_error", "Could not load games.");
    return c.json(data);
  })
  // Shared existence/ownership check for all single-game operations.
  .use("/:id", validate("param", gameIdSchema), async (c, next) => {
    const { data, error } = await createAdminClient(c.env)
      .from("games")
      .select("owner_id")
      .eq("id", c.req.param("id"))
      .maybeSingle();
    if (error)
      return fail(c, 500, "database_error", "Could not load the game.");
    if (!data) return fail(c, 404, "not_found", "Game not found.");
    if (data.owner_id !== c.get("user").id)
      return fail(c, 403, "forbidden", "This game does not belong to you.");
    await next();
  })
  .get("/:id", async (c) => {
    const { data, error } = await createAdminClient(c.env)
      .from("games")
      .select(COLUMNS)
      .eq("id", c.req.param("id"))
      .eq("owner_id", c.get("user").id)
      .maybeSingle();
    if (error)
      return fail(c, 500, "database_error", "Could not load the game.");
    if (!data) return fail(c, 404, "not_found", "Game not found.");
    return c.json(data);
  })
  .put("/:id", validate("json", moveSchema), async (c) => {
    const supabase = createAdminClient(c.env);
    const id = c.req.param("id");
    const ownerId = c.get("user").id;
    const { data: existing, error: readError } = await supabase
      .from("games")
      .select(COLUMNS)
      .eq("id", id)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (readError)
      return fail(c, 500, "database_error", "Could not load the game.");
    if (!existing) return fail(c, 404, "not_found", "Game not found.");
    const position = c.req.valid("json").position as Position;
    const result = makeMove(replay(existing.moves), {
      type: "MAKE_MOVE",
      position,
    });
    if (!result.ok) return fail(c, 400, "invalid_move", result.error);
    const { board, status } = result.value;
    const { data, error } = await supabase
      .from("games")
      .update({
        board: board.map((cell) => cell ?? "_").join(""),
        moves: [...existing.moves, position],
        outcome: status.status,
        turn: status.status === "in_progress" ? status.turn : null,
        winner: status.status === "game_won" ? status.winner : null,
        winning_line: status.status === "game_won" ? [...status.line] : null,
        completed_at:
          status.status === "in_progress" ? null : new Date().toISOString(),
      })
      .eq("id", id)
      .eq("owner_id", ownerId)
      .eq("move_count", existing.move_count)
      .eq("outcome", "in_progress")
      .select(COLUMNS)
      .maybeSingle();
    if (error)
      return fail(c, 500, "database_error", "Could not save the move.");
    if (!data)
      return fail(
        c,
        409,
        "conflict",
        "The game changed. Reload before moving again.",
      );
    return c.json(data);
  })
  .delete("/:id", async (c) => {
    const { data, error } = await createAdminClient(c.env)
      .from("games")
      .delete()
      .eq("id", c.req.param("id"))
      .eq("owner_id", c.get("user").id)
      .eq("outcome", "in_progress")
      .select("id")
      .maybeSingle();
    if (error)
      return fail(c, 500, "database_error", "Could not abandon the game.");
    if (!data)
      return fail(
        c,
        400,
        "invalid_game",
        "Only active games can be abandoned.",
      );
    return c.body(null, 204);
  });
