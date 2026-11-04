import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppEnv } from "../env";
import { nasa } from "./nasa";
import { fetchApod } from "../lib/nasa";

const env = {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_test",
  NASA_API_KEY: "nasa-private",
  GEMINI_API_KEY: "gemini-private",
  GEMINI_MODEL: "test-model",
};
const app = new Hono<AppEnv>();
app.use("*", async (c, next) => {
  c.set("user", { id: "11111111-1111-4111-8111-111111111111", email: "" });
  await next();
});
app.route("/nasa", nasa);
const picture = {
  date: "2024-03-15",
  title: "Galaxy",
  explanation: "A galaxy.",
  url: "https://images.nasa.gov/galaxy.jpg",
  media_type: "image",
};
const explanation = {
  hebrew_title: "גלקסיה",
  hebrew_summary: "זוהי גלקסיה.",
  tags: ["galaxy"],
};
let generated: unknown;
let cached: unknown;
let saved: unknown;

beforeEach(() => {
  generated = explanation;
  cached = null;
  saved = undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request | URL | string, init?: RequestInit) => {
      const request =
        input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url);
      if (url.hostname === "api.nasa.gov") {
        expect(url.pathname).toBe("/planetary/apod");
        expect(url.searchParams.get("api_key")).toBe(env.NASA_API_KEY);
        return Response.json(
          url.searchParams.has("count") ? [picture] : picture,
        );
      }
      if (url.hostname === "generativelanguage.googleapis.com") {
        expect(request.headers.get("x-goog-api-key")).toBe(env.GEMINI_API_KEY);
        return Response.json({
          candidates: [
            { content: { parts: [{ text: JSON.stringify(generated) }] } },
          ],
        });
      }
      if (request.method === "POST") {
        saved = await request.json();
        return new Response(null, { status: 201 });
      }
      return Response.json(
        url.searchParams.get("date")?.startsWith("eq.") ? cached : [],
      );
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function explain(date: unknown, extra = {}) {
  return app.request(
    "/nasa/explain",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, ...extra }),
    },
    env,
  );
}

describe("NASA proxy security", () => {
  it.each([
    "2024-03-15&api_key=hacked",
    "../../foo",
    "2024-02-30",
    "2024-3-15",
    "1995-06-15",
    "9999-01-01",
    null,
  ])("rejects date %s before making any external request", async (date) => {
    expect((await explain(date)).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["0", "21", "10000", "1.5", "nope", ""])(
    "rejects count %s",
    async (count) => {
      expect(
        (await app.request(`/nasa/pictures?count=${count}`, {}, env)).status,
      ).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("accepts the maximum count without exposing keys", async () => {
    const response = await app.request("/nasa/pictures?count=20", {}, env);
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).not.toContain(env.NASA_API_KEY);
    expect(body).not.toContain(env.GEMINI_API_KEY);
  });
  it("ignores client-supplied source material and validates output before caching", async () => {
    const response = await explain(picture.date, {
      title: "hacked",
      explanation: "hacked",
      created_by: "hacked",
    });
    expect(response.status).toBe(200);
    expect(saved).toMatchObject({
      nasa_title: picture.title,
      nasa_explanation: picture.explanation,
      created_by: "11111111-1111-4111-8111-111111111111",
      ...explanation,
    });
  });
  it("never caches invalid Gemini tags", async () => {
    generated = { ...explanation, tags: ["hacked"] };
    expect((await explain(picture.date)).status).toBe(500);
    expect(saved).toBeUndefined();
  });
  it("returns cached explanations without calling providers", async () => {
    cached = { date: picture.date, ...explanation };
    expect((await explain(picture.date)).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not leak upstream errors or secrets", async () => {
    vi.mocked(fetch).mockRejectedValue(
      new Error(`Secret URL: ${env.NASA_API_KEY}`),
    );
    const response = await app.request("/nasa/pictures", {}, env);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain(env.NASA_API_KEY);
  });
  it("validates at the fetch boundary too", async () => {
    await expect(
      fetchApod(env.NASA_API_KEY, { date: "2024-03-15&api_key=hacked" }),
    ).rejects.toThrow();
    await expect(
      fetchApod(env.NASA_API_KEY, { count: 10000 }),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});
