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
  hebrew_summary: "זוהי גלקסיה. יש בה הרבה כוכבים.",
  tags: ["galaxy"],
};
let generated: unknown;
let cached: unknown;
let saved: unknown;
let claim: { result?: unknown; error_code?: string } | null;
let nasaEntries: unknown;
let failSave: boolean;
let failClaim: boolean;
let failGemini: boolean;
let geminiCalls: number;

beforeEach(() => {
  generated = explanation;
  cached = null;
  saved = undefined;
  claim = null;
  nasaEntries = [picture];
  failSave = false;
  failClaim = false;
  failGemini = false;
  geminiCalls = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request | URL | string, init?: RequestInit) => {
      const request =
        input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url);
      if (url.hostname === "api.nasa.gov") {
        expect(request.redirect).toBe("manual");
        expect(url.pathname).toBe("/planetary/apod");
        expect(url.searchParams.get("api_key")).toBe(env.NASA_API_KEY);
        return Response.json(
          url.searchParams.has("count") ? nasaEntries : picture,
        );
      }
      if (url.hostname === "generativelanguage.googleapis.com") {
        expect(request.redirect).toBe("manual");
        geminiCalls++;
        if (failGemini) throw new Error("Timed out after possible billing");
        expect(request.headers.get("x-goog-api-key")).toBe(env.GEMINI_API_KEY);
        const body = (await request.json()) as {
          generationConfig: {
            responseMimeType: string;
            responseJsonSchema: {
              properties: { tags: { items: { enum: string[] } } };
            };
          };
          contents: { parts: { text: string }[] }[];
        };
        expect(body.generationConfig.responseMimeType).toBe("application/json");
        expect(
          body.generationConfig.responseJsonSchema.properties.tags.items.enum,
        ).toContain("galaxy");
        expect(JSON.parse(body.contents[0].parts[0].text)).toEqual({
          title: picture.title,
          explanation: picture.explanation,
        });
        return Response.json({
          candidates: [
            { content: { parts: [{ text: JSON.stringify(generated) }] } },
          ],
        });
      }
      if (url.pathname.endsWith("/space_explanation_requests")) {
        if (request.method === "POST") {
          if (failClaim)
            return Response.json(
              { code: "DB_ERROR", message: "Unavailable" },
              { status: 500 },
            );
          if (claim)
            return Response.json(
              { code: "23505", message: "Duplicate" },
              { status: 409 },
            );
          claim = {};
          return new Response(null, { status: 201 });
        }
        if (request.method === "PATCH") {
          claim = { ...claim, ...(await request.json()) };
          return new Response(null, { status: 204 });
        }
        return Response.json(claim);
      }
      if (request.method === "POST") {
        if (failSave)
          return Response.json(
            { code: "DB_ERROR", message: "Unavailable" },
            { status: 500 },
          );
        saved = await request.json();
        cached = saved;
        return new Response(null, { status: 201 });
      }
      return Response.json(
        url.searchParams.get("date")?.startsWith("eq.")
          ? cached
          : cached
            ? [cached]
            : [],
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
  it("calls Gemini only once for simultaneous cache misses", async () => {
    const responses = await Promise.all([
      explain(picture.date),
      explain(picture.date),
    ]);
    expect(responses.map((response) => response.status)).toContain(200);
    expect(
      responses.every((response) => [200, 409].includes(response.status)),
    ).toBe(true);
    expect(geminiCalls).toBe(1);
    expect((await explain(picture.date)).status).toBe(200);
    expect(geminiCalls).toBe(1);
  });
  it("recovers a failed final cache write without paying again", async () => {
    failSave = true;
    expect((await explain(picture.date)).status).toBe(500);
    expect(claim?.result).toMatchObject(explanation);
    failSave = false;
    expect((await explain(picture.date)).status).toBe(200);
    expect(saved).toMatchObject(explanation);
    expect(geminiCalls).toBe(1);
  });
  it("does not repeat an uncertain paid request after a timeout", async () => {
    failGemini = true;
    expect((await explain(picture.date)).status).toBe(502);
    failGemini = false;
    expect((await explain(picture.date)).status).toBe(502);
    expect(geminiCalls).toBe(1);
    expect(saved).toBeUndefined();
  });
  it("does not pay when the database cannot acquire a claim", async () => {
    failClaim = true;
    expect((await explain(picture.date)).status).toBe(500);
    expect(geminiCalls).toBe(0);
  });
  it("lets the user check an in-progress explanation without generating again", async () => {
    claim = {};
    const response = await explain(picture.date);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: "explanation_pending" },
    });
    expect(geminiCalls).toBe(0);
  });
  it("filters videos and duplicate dates and attaches cached explanations", async () => {
    nasaEntries = [
      picture,
      picture,
      { ...picture, date: "2024-03-16", media_type: "video" },
    ];
    cached = { date: picture.date, ...explanation };
    const response = await app.request("/nasa/pictures", {}, env);
    expect(await response.json()).toEqual([{ ...picture, ...explanation }]);
    expect(geminiCalls).toBe(0);
  });
  it.each([
    { ...explanation, hebrew_title: "English only" },
    { ...explanation, hebrew_summary: " " },
    { ...explanation, tags: [] },
    { ...explanation, tags: ["galaxy", "galaxy"] },
    {
      ...explanation,
      tags: ["galaxy", "nebula", "star", "planet", "sun", "earth"],
    },
  ])("rejects invalid output and never regenerates it", async (invalid) => {
    generated = invalid;
    expect((await explain(picture.date)).status).toBe(500);
    expect((await explain(picture.date)).status).toBe(502);
    expect(saved).toBeUndefined();
    expect(geminiCalls).toBe(1);
  });
  it("rejects a mismatched NASA date", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ ...picture, date: "2024-03-16" }),
    );
    await expect(
      fetchApod(env.NASA_API_KEY, { date: picture.date }),
    ).rejects.toThrow();
  });
  it.each([
    new Response("NASA secret", { status: 429 }),
    Response.json({ error: "bad" }),
    new Response("not json"),
  ])("returns a safe error for NASA failures", async (upstream) => {
    vi.mocked(fetch).mockResolvedValueOnce(upstream);
    const response = await app.request("/nasa/pictures", {}, env);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("NASA secret");
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
