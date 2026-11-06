import { Hono } from "hono";
import type { AppEnv } from "../env";

/**
 * The paid fonts in client/public/fonts/ (made by scripts/fonts.mjs).
 *
 * wrangler.jsonc sends /fonts/* here before the static files, and this hands
 * a font over only when a page of this site asked for it. Opening the URL
 * directly, or using the font from another site, gets a 404.
 *
 * This is a hurdle, not a lock: the browser still downloads the font to
 * draw the text, and anyone can save it from there. The fonts are also cut
 * down to the characters the site uses, so what they get is incomplete.
 */
export const fonts = new Hono<AppEnv>().get("/*", (c) => {
  if (!isFontLoadFromThisSite(c.req.raw)) {
    return c.text("Not found", 404);
  }
  return c.env.ASSETS.fetch(c.req.raw);
});

/**
 * True when the browser says it is loading a font for a page of this site.
 *
 * Browsers mark every request with Sec-Fetch-Dest (what it is for) and
 * Sec-Fetch-Site (who asked), and pages can't change these. Browsers too old
 * to send them get the Referer check instead.
 */
export function isFontLoadFromThisSite(request: Request): boolean {
  const destination = request.headers.get("sec-fetch-dest");
  if (destination !== null) {
    return (
      destination === "font" &&
      request.headers.get("sec-fetch-site") === "same-origin"
    );
  }

  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
