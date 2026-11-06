import { describe, expect, it } from "vitest";
import { isFontLoadFromThisSite } from "./fonts";

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
