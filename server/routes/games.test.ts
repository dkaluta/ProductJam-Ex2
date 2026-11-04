import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppEnv } from "../env";
import { games } from "./games";
import app from "../index";

const OWNER = "11111111-1111-4111-8111-111111111111";
const ID = "22222222-2222-4222-8222-222222222222";
const env = {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_test",
  NASA_API_KEY: "nasa-private",
  GEMINI_API_KEY: "gemini-private",
};
const harness = new Hono<AppEnv>();
harness.use("*", async (c, next) => {
  c.set("user", { id: OWNER, email: "test@example.com" });
  await next();
});
harness.route("/games", games);

function initialRow() {
  return {
    id: ID,
    owner_id: OWNER,
    board: "________________",
    moves: [] as number[],
    move_count: 0,
    outcome: "in_progress",
    turn: "X",
    winner: null,
    winning_line: null,
    completed_at: null,
  };
}
let row = initialRow();
let inserted: Record<string, unknown> | undefined;
let writes: number;
let concurrent: boolean;
let reads: number;
let releaseReads: () => void;
let bothRead: Promise<void>;

beforeEach(() => {
  row = initialRow();
  inserted = undefined;
  writes = 0;
  concurrent = false;
  reads = 0;
  bothRead = new Promise<void>((resolve) => {
    releaseReads = resolve;
  });
  // Use the real Supabase client: check the HTTP filters it actually sends.
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request | URL | string, init?: RequestInit) => {
      const request =
        input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url);
      if (request.method === "POST") {
        inserted = (await request.json()) as Record<string, unknown>;
        return Response.json({ ...row, ...inserted });
      }
      if (request.method === "PATCH") {
        writes++;
        const update = (await request.json()) as Partial<typeof row>;
        const matches =
          url.searchParams.get("id") === `eq.${row.id}` &&
          url.searchParams.get("owner_id") === `eq.${row.owner_id}` &&
          url.searchParams.get("move_count") === `eq.${row.move_count}` &&
          url.searchParams.get("outcome") === `eq.${row.outcome}`;
        if (!matches) return Response.json([]);
        row = { ...row, ...update };
        row.move_count = row.moves.length;
        return Response.json([row]);
      }
      if (request.method === "GET") {
        const snapshot = structuredClone(row);
        if (concurrent && url.searchParams.get("select") !== "owner_id") {
          reads++;
          if (reads === 2) releaseReads();
          await bothRead;
        }
        return Response.json(snapshot);
      }
      throw new Error("Unexpected database operation");
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function move(position: unknown) {
  return harness.request(
    `/games/${ID}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position, outcome: "game_won", winner: "O" }),
    },
    env,
  );
}

describe("game integrity", () => {
  it("derives ownership from the authenticated user and ignores forged game state", async () => {
    const response = await harness.request(
      "/games",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner_id: ID, outcome: "game_won", moves: [1] }),
      },
      env,
    );
    expect(response.status).toBe(201);
    expect(inserted).toEqual({ owner_id: OWNER });
  });

  it("commits one of two moves evaluated against the same version", async () => {
    concurrent = true;
    const responses = await Promise.all([move(0), move(1)]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    expect(row.move_count).toBe(1);
    expect(row.moves).toHaveLength(1);
    expect(row.board.replaceAll("_", "")).toBe("X");
    expect(row.turn).toBe("O");
  });

  it("rejects another owner's game without writing", async () => {
    row.owner_id = ID;
    expect((await move(0)).status).toBe(403);
    expect(writes).toBe(0);
  });

  it.each([-1, 16, 1.5, "0", null])(
    "rejects invalid position %s",
    async (position) => {
      expect((await move(position)).status).toBe(400);
      expect(writes).toBe(0);
    },
  );

  it("rejects an occupied cell", async () => {
    row.moves = [0];
    row.move_count = 1;
    expect((await move(0)).status).toBe(400);
    expect(writes).toBe(0);
  });

  it("derives a win from move history and rejects moves after it", async () => {
    row.moves = [0, 4, 1, 5, 2, 6];
    row.move_count = 6;
    expect((await move(3)).status).toBe(200);
    expect(row.outcome).toBe("game_won");
    expect(row.winner).toBe("X");
    expect(row.winning_line).toEqual([0, 1, 2, 3]);
    expect(row.turn).toBeNull();
    expect(row.completed_at).not.toBeNull();
    expect((await move(7)).status).toBe(400);
    expect(writes).toBe(1);
  });

  it.each([
    ["/api/games", "POST"],
    [`/api/games/${ID}`, "PUT"],
    ["/api/nasa/pictures", "GET"],
    ["/api/nasa/explain", "POST"],
  ])("requires login for %s", async (path, method) => {
    expect((await app.request(path, { method }, env)).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
});
