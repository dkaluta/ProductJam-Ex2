import { afterEach, describe, expect, it, vi } from "vitest";
import { parseApodPage, recoverApodPicture } from "./apod-page";
import { fetchApod } from "./nasa";
import { isNasaPlaceholder } from "@shared/space-images";

const picture = {
  date: "2024-03-15",
  title: "NASA Science",
  explanation: "Discover the cosmos!",
  url: "https://science.nasa.gov/nasa-logo.png",
  media_type: "image" as const,
};
const html = `<html><head><meta content="https://assets.science.nasa.gov/galaxy.jpg?a=1&amp;b=2" property="og:image"></head><body><h1>Galaxy &amp; stars</h1><p>Site introduction</p><p><strong>Explanation:</strong> A <a href="/">spiral galaxy</a> with many stars. &#8217;</p></body></html>`;

afterEach(() => vi.unstubAllGlobals());

describe("NASA migrated APOD pages", () => {
  it("extracts the real photograph and plain text instead of the NASA logo", () => {
    expect(parseApodPage(html, picture)).toMatchObject({
      title: "Galaxy & stars",
      explanation: "A spiral galaxy with many stars. ’",
      url: "https://assets.science.nasa.gov/galaxy.jpg?a=1&b=2",
      date: picture.date,
    });
  });
  it("rejects a page without actual astronomy content", () => {
    expect(() =>
      parseApodPage(
        '<h1>NASA Science</h1><meta property="og:image" content="https://science.nasa.gov/nasa-logo.png">',
        picture,
      ),
    ).toThrow();
  });
  it("rejects the generic APOD landing page even if it has a featured image", () => {
    expect(() =>
      parseApodPage(
        html.replace("Galaxy &amp; stars", "Astronomy Picture of the Day"),
        picture,
      ),
    ).toThrow();
  });
  it("repairs broken API records using NASA's date page", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json([picture]))
        .mockResolvedValueOnce(
          new Response(null, {
            status: 301,
            headers: {
              location: "https://science.nasa.gov/image-article/apod-galaxy/",
            },
          }),
        )
        .mockResolvedValueOnce(new Response(html)),
    );
    const result = await fetchApod("private-key", { count: 1 });
    expect(result[0].title).toBe("Galaxy & stars");
    const calls = vi.mocked(fetch).mock.calls;
    expect(String(calls[1][0])).toBe(
      "https://apod.nasa.gov/apod/ap240315.html",
    );
    expect(String(calls[2][0])).not.toContain("private-key");
    expect(calls[2][1]?.redirect).toBe("manual");
  });
  const meatball =
    "https://assets.science.nasa.gov/content/dam/science/astro/programs/cosmic-origins/images/misc/news-thumbnail.png/jcr:content/renditions/cq5dam.web.1280.1280.png";
  const withArticle = (media: string) =>
    html
      .replace(
        "</body>",
        `<article><div class="entry-content">${media}</div></article><footer><img src="https://science.nasa.gov/nasa-logo.png"></footer></body>`,
      )
      .replace(
        "https://assets.science.nasa.gov/galaxy.jpg?a=1&amp;b=2",
        meatball,
      );
  it("uses the real animated GIF when the social preview is the meatball", () => {
    const page = withArticle(
      '<img src="https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/2001/december/asteroid1998wt24_ago_big.gif">',
    );
    expect(parseApodPage(page, picture)).toMatchObject({
      media_type: "image",
      url: "https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/2001/december/asteroid1998wt24_ago_big.gif",
    });
  });
  it.each([
    [
      '<iframe src="https://player.vimeo.com/video/58385453"></iframe>',
      "https://player.vimeo.com/video/58385453",
    ],
    [
      '<video><source src="https://assets.science.nasa.gov/comet.mp4" type="video/mp4"></video>',
      "https://assets.science.nasa.gov/comet.mp4",
    ],
  ])(
    "classifies video pages as video instead of showing their social-preview meatball",
    (media, url) => {
      expect(parseApodPage(withArticle(media), picture)).toMatchObject({
        media_type: "video",
        url,
      });
    },
  );
  it("rejects a page whose only picture is the generic news thumbnail", () => {
    expect(() => parseApodPage(withArticle(""), picture)).toThrow(
      "NASA page did not contain an astronomy picture",
    );
  });
  it("recovers API records that directly use the generic news thumbnail", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json([{ ...picture, title: "Asteroid", url: meatball }]),
        )
        .mockResolvedValueOnce(
          new Response(
            withArticle(
              '<img src="https://assets.science.nasa.gov/asteroid.gif">',
            ),
          ),
        ),
    );
    expect((await fetchApod("private-key", { count: 1 }))[0].url).toBe(
      "https://assets.science.nasa.gov/asteroid.gif",
    );
  });
  it.each([
    meatball,
    "https://science.nasa.gov/wp-content/themes/nasa-child/assets/images/nasa-logo@2x.png",
    "https://www.nasa.gov/nasa_meatball.svg",
  ])("recognizes NASA site artwork: %s", (url) => {
    expect(isNasaPlaceholder(url)).toBe(true);
  });
  it("keeps a real astronomy image", () => {
    expect(
      isNasaPlaceholder(
        "https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/1998/march/asteroids3_neargal_big.jpg/jcr:content/renditions/cq5dam.web.1280.1280.jpeg",
      ),
    ).toBe(false);
  });
  it("refuses redirects away from the two approved NASA hosts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { location: "https://evil.example/" },
        }),
      ),
    );
    await expect(recoverApodPicture(picture)).rejects.toThrow(
      "Unexpected NASA redirect",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("uses the featured image when the new API url is an article permalink", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json([
          {
            ...picture,
            title: "Galaxy",
            url: "https://science.nasa.gov/image-article/galaxy/",
            permalink: "https://science.nasa.gov/image-article/galaxy/",
            hdurl: "https://assets.science.nasa.gov/galaxy.jpg",
          },
        ]),
      ),
    );
    const result = await fetchApod("private-key", { count: 1 });
    expect(result[0].url).toBe("https://assets.science.nasa.gov/galaxy.jpg");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("keeps healthy photos when a migrated entry cannot be recovered", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json([
            picture,
            {
              ...picture,
              date: "2024-03-16",
              title: "Healthy galaxy",
              url: "https://assets.science.nasa.gov/good.jpg",
            },
          ]),
        )
        .mockResolvedValueOnce(new Response("Unavailable", { status: 503 })),
    );
    const result = await fetchApod("private-key", { count: 2 });
    expect(result.map((item) => item.title)).toEqual(["Healthy galaxy"]);
  });
  it("accepts iframe entries without rejecting the image batch", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json([
            { ...picture, title: "Embedded video", media_type: "iframe" },
          ]),
        ),
    );
    expect((await fetchApod("private-key", { count: 1 }))[0].media_type).toBe(
      "other",
    );
  });
});
