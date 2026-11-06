/**
 * Puts the paid fonts into client/public/fonts/ before a build. It runs as
 * part of `npm run build` (and so `npm run deploy`).
 *
 * They are licensed, so they are not in git (see .gitignore). On your own
 * computer they are already in that folder and this script does nothing. On
 * Cloudflare, which builds from the repository, it writes each missing font
 * from a BUILD variable (Settings → Build → Variables and secrets - not the
 * Worker's own runtime variables, which the build can't see):
 *
 *   1. Its own base64 variable (named in FONTS below). Make the value with
 *        base64 -i client/public/fonts/narkiss-block-regular.otf | pbcopy
 *   2. Otherwise FONTS_BASE_URL - a folder online that holds the same files,
 *      e.g. https://example.r2.dev/fonts
 *
 * On your computer a missing font only prints a warning, and the page falls
 * back to other fonts. On Cloudflare (CI) it stops the build instead, so a
 * deploy never goes out without its fonts by accident.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";

// File names without "+" or spaces: Cloudflare redirects "+" in a URL.
const FONTS = [
  { file: "fedra-serif-demi.otf", variable: "FONT_FEDRA_SERIF_BASE64" },
  { file: "narkiss-block-regular.otf", variable: "FONT_NARKISS_BLOCK_BASE64" },
];
const DIR = new URL("../client/public/fonts/", import.meta.url);
const BASE = process.env.FONTS_BASE_URL?.trim().replace(/\/$/, "");
const IN_CI = Boolean(process.env.CI || process.env.WORKERS_CI);

/**
 * True for a whole OpenType/TrueType font: it starts with a font signature,
 * and every table its table of contents lists is really there. A base64
 * value that was cut off still starts right, so the second check matters.
 */
function isCompleteFont(bytes) {
  if (bytes.length < 12) return false;
  const tag = bytes.subarray(0, 4).toString("latin1");
  if (tag !== "OTTO" && tag !== "\0\x01\0\0" && tag !== "true") return false;

  const tableCount = bytes.readUInt16BE(4);
  if (bytes.length < 12 + tableCount * 16) return false;
  for (let i = 0; i < tableCount; i++) {
    const record = 12 + i * 16;
    const end =
      bytes.readUInt32BE(record + 8) + bytes.readUInt32BE(record + 12);
    if (end > bytes.length) return false;
  }
  return true;
}

/** Accepts the value with quotes, line breaks or a data: URL prefix. */
function decodeBase64(value) {
  const cleaned = value
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^data:[^,]*,/, "")
    .replace(/\s+/g, "");
  return Buffer.from(cleaned, "base64");
}

await mkdir(DIR, { recursive: true });

const missing = [];

for (const { file, variable } of FONTS) {
  const target = new URL(file, DIR);
  if (existsSync(target)) continue;

  let bytes;
  let source;
  if (process.env[variable]) {
    bytes = decodeBase64(process.env[variable]);
    source = `${variable} (${process.env[variable].length} characters)`;
  } else if (BASE) {
    const url = `${BASE}/${file}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `fetch-fonts: could not download ${url} (${response.status})`,
      );
    }
    bytes = Buffer.from(await response.arrayBuffer());
    source = url;
  } else {
    missing.push(`${file} - set the build variable ${variable}`);
    continue;
  }

  if (!isCompleteFont(bytes)) {
    throw new Error(
      `fetch-fonts: ${source} did not give a font file (${bytes.length} bytes). ` +
        "If it came from a variable, the value may be cut off - paste the whole output of base64 again.",
    );
  }
  await writeFile(target, bytes);
  console.log(
    `fetch-fonts: wrote ${file} (${bytes.length} bytes) from ${source}`,
  );
}

if (missing.length > 0) {
  const message = `fetch-fonts: missing fonts:\n  ${missing.join("\n  ")}`;
  if (IN_CI) {
    throw new Error(
      `${message}\n(Build variables, not the Worker's runtime variables.)`,
    );
  }
  console.warn(`${message}\nThe page will use fallback fonts.`);
}
