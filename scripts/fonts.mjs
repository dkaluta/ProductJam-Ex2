/**
 * The paid fonts (Fedra Serif, Narkiss Block).
 *
 *   fonts-source/        The full fonts. Not in git, never served.
 *   fonts-encrypted/     Encrypted copies of fonts-source/, in git. FONTS_KEY
 *                        unlocks them - from .env locally, and a Cloudflare
 *                        build secret (Settings → Build → Variables and
 *                        secrets) on deploys.
 *   client/public/fonts/ What the site serves: WOFF2 files cut down to the
 *                        characters the pages that use these fonts contain.
 *                        Not in git; this script makes them.
 *
 * So a visitor who saves the font files gets only those characters, not the
 * whole font. The Worker also refuses /fonts/* requests that don't come from
 * the site's own pages (see server/routes/fonts.ts).
 *
 *   node scripts/fonts.mjs           Before `npm run dev` and `npm run build`
 *                                    (both run it): unlocks any missing full
 *                                    font, then makes the cut-down WOFF2s.
 *   node scripts/fonts.mjs encrypt   After adding or changing a font in
 *                                    fonts-source/ (`npm run fonts:encrypt`).
 *                                    Makes a key first if .env has none.
 *                                    Commit fonts-encrypted/ afterwards.
 *
 * Without the key, missing fonts only print a warning on your computer (the
 * page falls back to other fonts), but stop the build on Cloudflare, so a
 * deploy never goes out without its fonts by accident.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import {
  appendFile,
  mkdir,
  readFile,
  readdir,
  rename,
  writeFile,
} from "node:fs/promises";
import subsetFont from "subset-font";

const FONTS = ["fedra-serif-demi", "narkiss-block-regular"];
const SOURCE = new URL("../fonts-source/", import.meta.url);
const ENCRYPTED = new URL("../fonts-encrypted/", import.meta.url);
const SERVED = new URL("../client/public/fonts/", import.meta.url);
const ENV_FILE = new URL("../.env", import.meta.url);
/** The folders whose text is set in these fonts. Add any new page here. */
const TEXT_FROM = [
  new URL("../client/pages/responsive-demo/", import.meta.url),
];
const IN_CI = Boolean(process.env.CI || process.env.WORKERS_CI);

// AES-256-GCM. Each encrypted file is: 12-byte IV, 16-byte tag, then data.
const IV_BYTES = 12;
const TAG_BYTES = 16;

function readKey() {
  const value = process.env.FONTS_KEY?.trim();
  if (!value) return null;
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error(
      "fonts: FONTS_KEY is not a valid key (it should be 44 characters ending in =). Copy it again from .env.",
    );
  }
  return key;
}

const sourceFile = (name) => new URL(`${name}.otf`, SOURCE);

async function encrypt() {
  let key = readKey();
  if (!key) {
    key = randomBytes(32);
    await appendFile(
      ENV_FILE,
      `\n# Unlocks the fonts in fonts-encrypted/ (see scripts/fonts.mjs)\nFONTS_KEY=${key.toString("base64")}\n`,
    );
    console.log("fonts: made a new FONTS_KEY and added it to .env");
  }

  await mkdir(ENCRYPTED, { recursive: true });
  for (const name of FONTS) {
    const plain = await readFile(sourceFile(name));
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const data = Buffer.concat([cipher.update(plain), cipher.final()]);
    await writeFile(
      new URL(`${name}.otf.enc`, ENCRYPTED),
      Buffer.concat([iv, cipher.getAuthTag(), data]),
    );
    console.log(`fonts: encrypted ${name}.otf`);
  }
}

/** Makes sure fonts-source/ has every font. Returns the ones it has. */
async function unlockSources() {
  await mkdir(SOURCE, { recursive: true });

  // Earlier versions kept the full fonts in client/public/fonts/.
  for (const name of FONTS) {
    const old = new URL(`${name}.otf`, SERVED);
    if (!existsSync(sourceFile(name)) && existsSync(old)) {
      await rename(old, sourceFile(name));
      console.log(`fonts: moved ${name}.otf to fonts-source/`);
    }
  }

  const missing = FONTS.filter((name) => !existsSync(sourceFile(name)));
  if (missing.length === 0) return FONTS;

  const key = readKey();
  if (!key) {
    const message = `fonts: ${missing.join(" and ")} missing, and FONTS_KEY is not set.`;
    if (IN_CI) {
      throw new Error(
        `${message}\nAdd FONTS_KEY (from your .env) in Cloudflare: Settings → Build → Variables and secrets.`,
      );
    }
    console.warn(`${message} The page will use fallback fonts.`);
    return FONTS.filter((name) => !missing.includes(name));
  }

  for (const name of missing) {
    const blob = await readFile(new URL(`${name}.otf.enc`, ENCRYPTED));
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      blob.subarray(0, IV_BYTES),
    );
    decipher.setAuthTag(blob.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    let plain;
    try {
      plain = Buffer.concat([
        decipher.update(blob.subarray(IV_BYTES + TAG_BYTES)),
        decipher.final(),
      ]);
    } catch {
      throw new Error(
        `fonts: FONTS_KEY does not unlock ${name}.otf.enc - it is the wrong key, or the file was encrypted with another one.`,
      );
    }
    await writeFile(sourceFile(name), plain);
    console.log(`fonts: decrypted ${name}.otf`);
  }
  return FONTS;
}

/** Every character in the source files of the pages that use the fonts. */
async function charactersUsed() {
  // All printable ASCII, so digits, punctuation and Latin always work...
  let text = String.fromCharCode(
    ...Array.from({ length: 95 }, (_, i) => 32 + i),
  );
  // ...plus whatever else the pages contain: the Hebrew, ·, ⇄ and so on.
  for (const folder of TEXT_FROM) {
    const files = await readdir(folder, { recursive: true });
    for (const file of files) {
      if (/\.(tsx?|css)$/.test(file)) {
        text += await readFile(new URL(file, folder), "utf8");
      }
    }
  }
  // Vertical arrows: TwoSides turns ⇄ into ⇅ with CSS, but keep both.
  return [...new Set(text + "⇅")]
    .filter((char) => char.codePointAt(0) >= 32)
    .join("");
}

async function makeServedFonts(names) {
  if (names.length === 0) return;
  await mkdir(SERVED, { recursive: true });
  const characters = await charactersUsed();
  for (const name of names) {
    const full = await readFile(sourceFile(name));
    const woff2 = await subsetFont(full, characters, { targetFormat: "woff2" });
    await writeFile(new URL(`${name}.woff2`, SERVED), woff2);
    console.log(
      `fonts: ${name}.woff2 - ${characters.length} characters, ${(woff2.length / 1024).toFixed(1)} KB (full font ${(full.length / 1024).toFixed(1)} KB)`,
    );
  }
}

if (process.argv[2] === "encrypt") {
  await encrypt();
} else {
  await makeServedFonts(await unlockSources());
}
