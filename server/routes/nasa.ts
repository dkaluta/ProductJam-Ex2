import { Hono } from "hono";
import { z } from "zod";
import {
  explainSchema,
  explanationSchema,
  picturesQuerySchema,
} from "@shared/schemas/nasa";
import type { AppEnv } from "../env";
import { fail, validate } from "../lib/errors";
import {
  DEFAULT_GEMINI_MODEL,
  explainPicture,
  GeminiError,
} from "../lib/gemini";
import { fetchApod } from "../lib/nasa";
import { createAdminClient } from "../lib/supabase";

const savedExplanationSchema = explanationSchema.extend({
  date: z.string(),
  nasa_title: z.string(),
  nasa_explanation: z.string(),
  image_url: z.string(),
  media_type: z.literal("image"),
  created_by: z.uuid(),
});
const EXPLANATION_COLUMNS = "date,hebrew_title,hebrew_summary,tags";

export const nasa = new Hono<AppEnv>()
  .get("/pictures", validate("query", picturesQuerySchema), async (c) => {
    let pictures;
    try {
      const entries = await fetchApod(c.env.NASA_API_KEY, c.req.valid("query"));
      pictures = [
        ...new Map(
          entries
            .filter((entry) => entry.media_type === "image")
            .map((entry) => [entry.date, entry]),
        ).values(),
      ];
    } catch (error) {
      // Log only the failure category, never a provider URL containing a key.
      console.warn(
        "NASA pictures unavailable",
        error instanceof Error ? error.name : "unknown",
      );
      return fail(c, 502, "nasa_unavailable", "Could not load NASA pictures.");
    }
    if (!pictures.length) return c.json([]);
    const { data, error } = await createAdminClient(c.env)
      .from("space_explanations")
      .select(EXPLANATION_COLUMNS)
      .in(
        "date",
        pictures.map((picture) => picture.date),
      );
    if (error)
      return fail(c, 500, "database_error", "Could not load explanations.");
    return c.json(
      pictures.map((picture) => ({
        ...picture,
        ...data.find((explanation) => explanation.date === picture.date),
      })),
    );
  })
  .post("/explain", validate("json", explainSchema), async (c) => {
    const { date } = c.req.valid("json");
    const supabase = createAdminClient(c.env);
    const { data: cached, error: readError } = await supabase
      .from("space_explanations")
      .select(EXPLANATION_COLUMNS)
      .eq("date", date)
      .maybeSingle();
    if (readError)
      return fail(c, 500, "database_error", "Could not load the explanation.");
    if (cached) {
      const parsed = explanationSchema.safeParse(cached);
      if (!parsed.success)
        return fail(
          c,
          500,
          "database_error",
          "The saved explanation is invalid.",
        );
      return c.json(parsed.data);
    }

    const model = c.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    if (!c.env.GEMINI_API_KEY || !/^[a-zA-Z0-9.-]+$/.test(model)) {
      return fail(
        c,
        503,
        "configuration_error",
        "The explanation service is not configured.",
      );
    }
    let picture;
    try {
      [picture] = await fetchApod(c.env.NASA_API_KEY, { date });
    } catch {
      return fail(
        c,
        502,
        "nasa_unavailable",
        "Could not load the NASA picture. Try again.",
      );
    }
    if (picture.media_type !== "image") {
      return fail(
        c,
        400,
        "not_a_picture",
        "This APOD entry is not a picture. Choose another date.",
      );
    }

    // A durable, unique claim BEFORE the paid call works across Worker instances.
    // Never expire/reclaim it automatically: a timeout can still have been billed.
    const { error: claimError } = await supabase
      .from("space_explanation_requests")
      .insert({ date });
    if (claimError) {
      if (claimError.code !== "23505") {
        return fail(
          c,
          500,
          "database_error",
          "Could not start the explanation.",
        );
      }
      const { data: request, error } = await supabase
        .from("space_explanation_requests")
        .select("result,error_code")
        .eq("date", date)
        .maybeSingle();
      if (error)
        return fail(
          c,
          500,
          "database_error",
          "Could not check the explanation.",
        );
      if (request?.result) {
        // Recover a completed generation even when the final cache write failed.
        const result = savedExplanationSchema.safeParse(request.result);
        if (!result.success)
          return fail(
            c,
            500,
            "database_error",
            "The saved explanation is invalid.",
          );
        const { error: saveError } = await supabase
          .from("space_explanations")
          .upsert(result.data, { onConflict: "date", ignoreDuplicates: true });
        if (saveError)
          return fail(
            c,
            500,
            "database_error",
            "Could not save the explanation. Try again.",
          );
        return c.json(explanationSchema.parse(result.data));
      }
      if (request?.error_code) {
        return fail(
          c,
          502,
          request.error_code,
          "This explanation could not be completed. Choose another picture; an administrator must review this request before another generation.",
        );
      }
      return fail(
        c,
        409,
        "explanation_pending",
        "This explanation is already being prepared. Check again shortly. If it stays unavailable, contact the administrator.",
      );
    }

    let explanation;
    try {
      explanation = await explainPicture(picture, c.env.GEMINI_API_KEY, model);
    } catch (error) {
      const code =
        error instanceof GeminiError ? error.code : "gemini_unavailable";
      await supabase
        .from("space_explanation_requests")
        .update({ error_code: code })
        .eq("date", date);
      return fail(
        c,
        code === "invalid_ai_output" ? 500 : 502,
        code,
        code === "invalid_ai_output"
          ? "The explanation had an invalid format. Choose another picture."
          : "Could not generate the explanation. Choose another picture.",
      );
    }
    const result = {
      date,
      nasa_title: picture.title,
      nasa_explanation: picture.explanation,
      image_url: picture.url,
      media_type: picture.media_type,
      ...explanation,
      created_by: c.get("user").id,
    };
    // Store a recovery copy first; retries never need to call Gemini again.
    const { error: resultError } = await supabase
      .from("space_explanation_requests")
      .update({ result })
      .eq("date", date);
    if (resultError)
      return fail(
        c,
        500,
        "database_error",
        "Could not save the explanation. Contact the administrator.",
      );
    const { error } = await supabase
      .from("space_explanations")
      .upsert(result, { onConflict: "date", ignoreDuplicates: true });
    if (error)
      return fail(
        c,
        500,
        "database_error",
        "Could not save the explanation. Try again.",
      );
    return c.json(explanation);
  });
