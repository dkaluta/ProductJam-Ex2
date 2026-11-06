/**
 * The paid fonts (Fedra Serif, Narkiss Block) are licensed, so the plain
 * files are not in git: client/public/fonts/ is in .gitignore. Instead the
 * repo holds encrypted copies in fonts-encrypted/, and one key, FONTS_KEY,
 * unlocks them. The key lives in your .env and, for deploys, in Cloudflare
 * (Settings → Build → Variables and secrets, as a secret).
 *
 *   node scripts/fonts.mjs           Before a build (`npm run build` runs it):
 *                                    writes any missing plain font from its
 *                                    encrypted copy.
 *   node scripts/fonts.mjs encrypt   After adding or changing a font
 *                                    (`npm run fonts:encrypt`): encrypts the
 *                                    plain fonts, making a key first if .env
 *                                    has none. Commit fonts-encrypted/.
 *
 * Without the key a missing font only prints a warning on your computer
 * (the page falls back to other fonts), but stops the build on Cloudflare,
 * so a deploy never goes out without its fonts by accident.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";

const FONTS = ["fedra-serif-demi.otf", "narkiss-block-regular.otf"];
const PLAIN = new URL("../client/public/fonts/", import.meta.url);
const ENCRYPTED = new URL("../fonts-encrypted/", import.meta.url);
const ENV_FILE = new URL("../.env", import.meta.url);
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
  for (const file of FONTS) {
    const plain = await readFile(new URL(file, PLAIN));
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const data = Buffer.concat([cipher.update(plain), cipher.final()]);
    await writeFile(
      new URL(`${file}.enc`, ENCRYPTED),
      Buffer.concat([iv, cipher.getAuthTag(), data]),
    );
    console.log(`fonts: encrypted ${file}`);
  }
}

async function decrypt() {
  const missing = FONTS.filter((file) => !existsSync(new URL(file, PLAIN)));
  if (missing.length === 0) return;

  const key = readKey();
  if (!key) {
    const message = `fonts: ${missing.join(" and ")} missing, and FONTS_KEY is not set.`;
    if (IN_CI) {
      throw new Error(
        `${message}\nAdd FONTS_KEY (from your .env) in Cloudflare: Settings → Build → Variables and secrets.`,
      );
    }
    console.warn(`${message} The page will use fallback fonts.`);
    return;
  }

  await mkdir(PLAIN, { recursive: true });
  for (const file of missing) {
    const blob = await readFile(new URL(`${file}.enc`, ENCRYPTED));
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
        `fonts: FONTS_KEY does not unlock ${file}.enc - it is the wrong key, or the file was encrypted with another one.`,
      );
    }
    await writeFile(new URL(file, PLAIN), plain);
    console.log(`fonts: decrypted ${file} (${plain.length} bytes)`);
  }
}

if (process.argv[2] === "encrypt") {
  await encrypt();
} else {
  await decrypt();
}
