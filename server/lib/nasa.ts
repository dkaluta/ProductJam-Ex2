import { z } from "zod";
import {
  apodDateSchema,
  apodPictureSchema,
  picturesQuerySchema,
} from "@shared/schemas/nasa";

import { isNasaPlaceholder } from "@shared/space-images";
import { recoverApodPicture } from "./apod-page";

export const pictureSchema = apodPictureSchema;
const providerPictureSchema = apodPictureSchema
  .extend({
    media_type: z.string().max(30),
    hdurl: z.url({ protocol: /^https?$/ }).nullish(),
    permalink: z.url({ protocol: /^https?$/ }).nullish(),
  })
  .transform((entry) => ({
    ...entry,
    media_type:
      entry.media_type === "image"
        ? ("image" as const)
        : entry.media_type === "video"
          ? ("video" as const)
          : ("other" as const),
  }));

// Fixed destination, validated parameters, and no redirects. Never fetch the
// media URL returned by NASA; it is display metadata, not a proxy destination.
export async function fetchApod(
  apiKey: string,
  input: { date: string } | { count: number },
) {
  const params =
    "date" in input
      ? { date: apodDateSchema.parse(input.date) }
      : picturesQuerySchema.parse(input);
  const url = new URL("https://api.nasa.gov/planetary/apod");
  url.searchParams.set("api_key", apiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    redirect: "manual",
    // Both random batches and date lookups can be slow on NASA's migrated API.
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error("NASA request failed");
  const body: unknown = await response.json();
  const pictures =
    "date" in input
      ? [providerPictureSchema.parse(body)]
      : z
          .array(providerPictureSchema)
          .max("count" in params ? params.count : 20)
          .parse(body);
  if ("date" in input && pictures[0].date !== input.date) {
    throw new Error("NASA returned the wrong date");
  }
  const results = await Promise.allSettled(
    pictures.map(async (entry) => {
      if (entry.media_type !== "image") return pictureSchema.parse(entry);
      const pageUrl =
        (new URL(entry.url).hostname === "science.nasa.gov" &&
          new URL(entry.url).pathname.startsWith("/image-article/")) ||
        entry.permalink === entry.url ||
        /\.html?(?:[?#]|$)/i.test(entry.url);
      if (isNasaPlaceholder(entry.url) || entry.title === "NASA Science") {
        return recoverApodPicture(entry);
      }
      if (pageUrl) {
        if (entry.hdurl && !isNasaPlaceholder(entry.hdurl)) {
          return pictureSchema.parse({ ...entry, url: entry.hdurl });
        }
        return recoverApodPicture(entry);
      }
      return pictureSchema.parse(entry);
    }),
  );
  const valid = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  if (pictures.length && !valid.length)
    throw new Error("NASA pictures unavailable");
  return valid;
}
