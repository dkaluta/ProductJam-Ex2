import { z } from "zod";
import { apodDateSchema, picturesQuerySchema } from "@shared/schemas/nasa";

export const pictureSchema = z.object({
  date: apodDateSchema,
  title: z.string().max(1000),
  explanation: z.string().max(30000),
  url: z.url({ protocol: /^https?$/ }),
  media_type: z.enum(["image", "video", "other"]),
});

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
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("NASA request failed");
  const body: unknown = await response.json();
  return "date" in input
    ? [pictureSchema.parse(body)]
    : z
        .array(pictureSchema)
        .max("count" in params ? params.count : 20)
        .parse(body);
}
