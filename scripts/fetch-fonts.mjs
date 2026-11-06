/**
 * Puts the paid fonts into client/public/fonts/ before a build.
 *
 * They are licensed, so they are not in git (see .gitignore). On your own
 * computer they are already in that folder and this script does nothing. On
 * Cloudflare, which builds from the repository, it writes each missing font
 * from a build variable you set in the Cloudflare dashboard:
 *
 *   1. Its own base64 variable (named in FONTS below). Make the value with
 *        base64 -i client/public/fonts/NarkissBlock-Regular.otf | pbcopy
 *   2. Otherwise FONTS_BASE_URL - a folder online that holds the same files,
 *      e.g. https://example.r2.dev/fonts
 *
 * With neither, the build still succeeds: the page falls back to other fonts,
 * and this prints a warning.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";

const FONTS = [
  { file: "FedraSerifH+L-Demi.otf", variable: "FONT_FEDRA_SERIF_BASE64" },
  { file: "NarkissBlock-Regular.otf", variable: "FONT_NARKISS_BLOCK_BASE64" },
];
const DIR = new URL("../client/public/fonts/", import.meta.url);
const BASE = process.env.FONTS_BASE_URL?.replace(/\/$/, "");

await mkdir(DIR, { recursive: true });

for (const { file, variable } of FONTS) {
  const target = new URL(encodeURIComponent(file), DIR);
  if (existsSync(target)) continue;

  const base64 = process.env[variable];
  if (base64) {
    await writeFile(target, Buffer.from(base64, "base64"));
    console.log(`fetch-fonts: wrote ${file} from ${variable}`);
    continue;
  }

  if (BASE) {
    const response = await fetch(`${BASE}/${encodeURIComponent(file)}`);
    if (!response.ok) {
      throw new Error(
        `fetch-fonts: could not download ${file} (${response.status})`,
      );
    }
    await writeFile(target, Buffer.from(await response.arrayBuffer()));
    console.log(`fetch-fonts: downloaded ${file}`);
    continue;
  }

  console.warn(
    `fetch-fonts: ${file} is missing and neither ${variable} nor FONTS_BASE_URL is set - using fallback fonts.`,
  );
}
