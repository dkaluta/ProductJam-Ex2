import { Hono } from "hono";
import type { AppEnv } from "../env";

/**
 * The paid fonts.
 *
 * client/public/fonts/ holds only locked (encrypted) copies, cut down to the
 * characters the site uses (scripts/fonts.mjs makes them). wrangler.jsonc
 * sends every /fonts/* request here first. When a page of this site asks for
 * /fonts/<name>.woff2, this reads <name>.woff2.enc and unlocks it with the
 * FONTS_KEY secret. Anything else - opening the URL directly, another site
 * using the font, asking for the .enc file - gets a 404.
 *
 * This is a hurdle, not a lock: the browser still downloads the font to
 * draw the text, and anyone can save it from there. What they get is the
 * cut-down font, not the whole one.
 */
const FONT_URL = /^\/fonts\/([a-z0-9-]+)\.woff2$/;

export const fonts = new Hono<AppEnv>().get("/*", async (c) => {
  const name = FONT_URL.exec(new URL(c.req.url).pathname)?.[1];
  if (!name || !isFontLoadFromThisSite(c.req.raw)) {
    return c.text("Not found", 404);
  }
  if (!c.env.FONTS_KEY) {
    console.error("fonts: FONTS_KEY is not set on this Worker");
    return c.text("Not found", 404);
  }

  const locked = await c.env.ASSETS.fetch(
    new URL(`/fonts/${name}.woff2.enc`, c.req.url),
  );
  if (!locked.ok) return c.text("Not found", 404);

  let font: ArrayBuffer;
  try {
    font = await unlockFont(await locked.arrayBuffer(), c.env.FONTS_KEY);
  } catch {
    // A missing file (the asset fallback answers with the HTML page) or the
    // wrong key both end up here.
    console.error(`fonts: could not unlock ${name}.woff2.enc`);
    return c.text("Not found", 404);
  }

  return new Response(font, {
    headers: {
      "content-type": "font/woff2",
      // "private": the browser may keep it, shared caches may not.
      "cache-control": "private, max-age=86400",
    },
  });
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

const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * Unlocks a file locked by scripts/fonts.mjs: AES-256-GCM, laid out as a
 * 12-byte IV, the 16-byte tag, then the data. Throws on a wrong key or a
 * damaged file.
 */
export async function unlockFont(
  locked: ArrayBuffer,
  keyBase64: string,
): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(locked);
  const iv = bytes.subarray(0, IV_BYTES);
  const tag = bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const data = bytes.subarray(IV_BYTES + TAG_BYTES);

  // Web Crypto wants the tag at the end, after the data.
  const dataThenTag = new Uint8Array(data.length + TAG_BYTES);
  dataThenTag.set(data);
  dataThenTag.set(tag, data.length);

  const key = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(atob(keyBase64.trim()), (char) => char.charCodeAt(0)),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, dataThenTag);
}
