/**
 * The paid fonts (Fedra Serif, Narkiss Block). One key, FONTS_KEY, locks
 * them: it is in your .env, and a runtime secret on the Cloudflare Worker.
 *
 *   fonts-source/        The full fonts. Not in git, never served.
 *   fonts-encrypted/     Encrypted copies of the full fonts, in git, so any
 *                        computer with the key can rebuild everything.
 *   client/public/fonts/ Encrypted WOFF2 files cut down to the characters the
 *                        pages using these fonts contain - in git, and
 *                        deployed as they are. The Worker unlocks one each
 *                        time a page asks for it (server/routes/fonts.ts), so
 *                        Cloudflare's build never needs the key.
 *
 * So a visitor can only ever get the cut-down font, and only by loading the
 * page: the Worker refuses /fonts/* requests from anywhere else.
 *
 *   node scripts/fonts.mjs           Run by `npm run dev` and `npm run build`.
 *                                    With the key (or the full fonts), it
 *                                    remakes the cut-down fonts when the
 *                                    page's text has changed - commit
 *                                    client/public/fonts/ afterwards. Without
 *                                    them (as on Cloudflare) it does nothing.
 *   node scripts/fonts.mjs encrypt   After adding or changing a font in
 *                                    fonts-source/ (`npm run fonts:encrypt`).
 *                                    Makes a key first if .env has none.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import {
  appendFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
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

// AES-256-GCM. Each encrypted file is: 12-byte IV, 16-byte tag, then data.
// server/routes/fonts.ts reads the same layout.
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

function lock(key, plain) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]);
}

function unlock(key, blob, what) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    blob.subarray(0, IV_BYTES),
  );
  decipher.setAuthTag(blob.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  try {
    return Buffer.concat([
      decipher.update(blob.subarray(IV_BYTES + TAG_BYTES)),
      decipher.final(),
    ]);
  } catch {
    throw new Error(
      `fonts: FONTS_KEY does not unlock ${what} - it is the wrong key, or the file was locked with another one.`,
    );
  }
}

const sourceFile = (name) => new URL(`${name}.otf`, SOURCE);
const servedFile = (name) => new URL(`${name}.woff2.enc`, SERVED);

async function encrypt() {
  let key = readKey();
  if (!key) {
    key = randomBytes(32);
    await appendFile(
      ENV_FILE,
      `\n# Unlocks the fonts (see scripts/fonts.mjs). Also a runtime secret on the Worker.\nFONTS_KEY=${key.toString("base64")}\n`,
    );
    console.log("fonts: made a new FONTS_KEY and added it to .env");
  }
  await mkdir(ENCRYPTED, { recursive: true });
  for (const name of FONTS) {
    await writeFile(
      new URL(`${name}.otf.enc`, ENCRYPTED),
      lock(key, await readFile(sourceFile(name))),
    );
    console.log(`fonts: encrypted ${name}.otf`);
  }
  // A new key means the served fonts need locking again too.
  await makeServedFonts(key, { force: true });
}

/** The full font, from fonts-source/ or unlocked from fonts-encrypted/. */
async function fullFont(key, name) {
  if (existsSync(sourceFile(name))) return readFile(sourceFile(name));
  return unlock(
    key,
    await readFile(new URL(`${name}.otf.enc`, ENCRYPTED)),
    `${name}.otf.enc`,
  );
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

async function makeServedFonts(key, { force = false } = {}) {
  await mkdir(SERVED, { recursive: true });
  const characters = await charactersUsed();
  for (const name of FONTS) {
    const woff2 = await subsetFont(await fullFont(key, name), characters, {
      targetFormat: "woff2",
    });
    // Locking uses a random IV, so the file would change on every run. Only
    // write it when the font inside is actually different.
    if (!force && existsSync(servedFile(name))) {
      const current = unlock(
        key,
        await readFile(servedFile(name)),
        `${name}.woff2.enc`,
      );
      if (current.equals(woff2)) continue;
    }
    await writeFile(servedFile(name), lock(key, woff2));
    console.log(
      `fonts: updated ${name}.woff2.enc - ${characters.length} characters, ${(woff2.length / 1024).toFixed(1)} KB. Commit client/public/fonts/.`,
    );
  }
}

async function build() {
  // Earlier versions kept plain fonts in client/public/fonts/. Full fonts go
  // to fonts-source/; plain cut-down ones are no longer needed.
  for (const name of FONTS) {
    const oldFull = new URL(`${name}.otf`, SERVED);
    if (existsSync(oldFull)) {
      if (!existsSync(sourceFile(name))) {
        await mkdir(SOURCE, { recursive: true });
        await rename(oldFull, sourceFile(name));
        console.log(`fonts: moved ${name}.otf to fonts-source/`);
      } else {
        await rm(oldFull);
      }
    }
    await rm(new URL(`${name}.woff2`, SERVED), { force: true });
  }

  const key = readKey();
  if (!key) {
    // Cloudflare's build lands here: it deploys the committed files as they are.
    console.log(
      "fonts: no FONTS_KEY here, so using the committed fonts in client/public/fonts/ as they are.",
    );
    return;
  }
  await makeServedFonts(key);
}

if (process.argv[2] === "encrypt") {
  await encrypt();
} else {
  await build();
}
