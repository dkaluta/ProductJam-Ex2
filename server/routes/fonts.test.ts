import { describe, expect, it } from "vitest";
import { isFontLoadFromThisSite, unlockFont } from "./fonts";

const URL_ = "https://wizzin.example.dev/fonts/narkiss-block-regular.woff2";

function request(headers: Record<string, string>) {
  return new Request(URL_, { headers });
}

describe("isFontLoadFromThisSite", () => {
  it("allows a font load from one of the site's pages", () => {
    expect(
      isFontLoadFromThisSite(
        request({ "sec-fetch-dest": "font", "sec-fetch-site": "same-origin" }),
      ),
    ).toBe(true);
  });

  it("refuses opening the URL directly", () => {
    expect(
      isFontLoadFromThisSite(
        request({ "sec-fetch-dest": "document", "sec-fetch-site": "none" }),
      ),
    ).toBe(false);
  });

  it("refuses a font load from another site", () => {
    expect(
      isFontLoadFromThisSite(
        request({ "sec-fetch-dest": "font", "sec-fetch-site": "cross-site" }),
      ),
    ).toBe(false);
  });

  it("refuses a fetch() for the file from the site's own pages", () => {
    expect(
      isFontLoadFromThisSite(
        request({ "sec-fetch-dest": "empty", "sec-fetch-site": "same-origin" }),
      ),
    ).toBe(false);
  });

  it("falls back to the Referer for browsers without Sec-Fetch headers", () => {
    expect(
      isFontLoadFromThisSite(
        request({ referer: "https://wizzin.example.dev/assets/page.css" }),
      ),
    ).toBe(true);
    expect(
      isFontLoadFromThisSite(request({ referer: "https://other.example/" })),
    ).toBe(false);
  });

  it("refuses a request with no headers at all, like curl", () => {
    expect(isFontLoadFromThisSite(request({}))).toBe(false);
  });
});

/** Locks bytes the way scripts/fonts.mjs does: IV, tag, then data. */
async function lock(rawKey: Uint8Array, plain: Uint8Array) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, [
    "encrypt",
  ]);
  // Web Crypto puts the 16-byte tag after the data; the file has it first.
  const dataThenTag = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain),
  );
  const data = dataThenTag.subarray(0, dataThenTag.length - 16);
  const tag = dataThenTag.subarray(dataThenTag.length - 16);
  const locked = new Uint8Array(12 + 16 + data.length);
  locked.set(iv);
  locked.set(tag, 12);
  locked.set(data, 28);
  return locked.buffer;
}

const randomKey = () => crypto.getRandomValues(new Uint8Array(32));
const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

describe("unlockFont", () => {
  const key = randomKey();
  const font = new TextEncoder().encode("wOF2 pretend font bytes");

  it("unlocks a file locked by scripts/fonts.mjs", async () => {
    const plain = await unlockFont(await lock(key, font), toBase64(key));
    expect(new Uint8Array(plain)).toEqual(font);
  });

  it("fails with the wrong key", async () => {
    await expect(
      unlockFont(await lock(key, font), toBase64(randomKey())),
    ).rejects.toThrow();
  });

  it("fails on something that isn't a locked file, like the HTML page", async () => {
    const html = new TextEncoder().encode("<!doctype html><html></html>")
      .buffer as ArrayBuffer;
    await expect(unlockFont(html, toBase64(key))).rejects.toThrow();
  });
});
