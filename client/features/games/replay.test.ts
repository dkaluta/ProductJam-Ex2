import { describe, expect, it } from "vitest";
import type { Position } from "@shared/game/types";
import { replayMoves } from "./replay";

const win: Position[] = [0, 4, 1, 5, 2, 6, 3];

describe("saved game replay", () => {
  it("starts empty and alternates the recorded marks without modifying history", () => {
    const moves = Object.freeze([...win]);
    expect(replayMoves(moves, 0)?.board.every((cell) => cell === null)).toBe(
      true,
    );
    const frame = replayMoves(moves, 2);
    expect(frame?.board[0]).toBe("X");
    expect(frame?.board[4]).toBe("O");
    expect(frame?.status).toEqual({ status: "in_progress", turn: "X" });
    expect(moves).toEqual(win);
  });
  it("shows a winning line only once the winning move has been reached", () => {
    expect(replayMoves(win, 6)?.status.status).toBe("in_progress");
    expect(replayMoves(win, 7)?.status).toEqual({
      status: "game_won",
      winner: "X",
      line: [0, 1, 2, 3],
    });
  });
  it("reconstructs a draw", () => {
    const draw: Position[] = [
      0, 1, 2, 3, 5, 4, 7, 6, 9, 8, 11, 10, 12, 13, 14, 15,
    ];
    expect(replayMoves(draw, 16)?.status).toEqual({ status: "draw" });
  });
  it("rejects corrupt history and moves after a win", () => {
    expect(replayMoves([0, 0], 2)).toBeNull();
    expect(replayMoves([...win, 7], 8)).toBeNull();
  });
  it("keeps requested positions within the saved history", () => {
    expect(replayMoves(win, -1)?.board.every((cell) => cell === null)).toBe(
      true,
    );
    expect(replayMoves(win, 100)?.status.status).toBe("game_won");
  });
});
