import {
  apodDateSchema,
  apodPictureSchema,
  type SpacePicture,
} from "@shared/schemas/nasa";

import { isNasaPlaceholder } from "@shared/space-images";

function plainText(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(
      /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
      (_, entity: string) => {
        if (entity.startsWith("#")) {
          const code =
            entity[1].toLowerCase() === "x"
              ? parseInt(entity.slice(2), 16)
              : Number(entity.slice(1));
          return code > 0 && code <= 0x10ffff
            ? String.fromCodePoint(code)
            : "�";
        }
        return (
          {
            amp: "&",
            lt: "<",
            gt: ">",
            quot: '"',
            apos: "'",
            nbsp: " ",
          } as Record<string, string>
        )[entity.toLowerCase()];
      },
    )
    .replace(/\s+/g, " ")
    .trim();
}

// NASA's migrated pages are a compatibility fallback for API records that
// incorrectly identify the NASA logo as the astronomy image. Never render HTML.
export function parseApodPage(html: string, picture: SpacePicture) {
  const title = plainText(
    html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "",
  );
  const explanation = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => plainText(match[1]))
    .find((text) => /^Explanation\s*:/i.test(text))
    ?.replace(/^Explanation\s*:\s*/i, "");
  if (
    !title ||
    /^(NASA Science|Astronomy Picture of the Day)$/i.test(title) ||
    !explanation
  ) {
    throw new Error("NASA page did not contain astronomy content");
  }
  // Social previews can be a generic meatball even when the article has a GIF.
  // Restrict media discovery to the article, excluding header/footer logos.
  const start = html.search(/<div\b[^>]*class=["'][^"']*\bentry-content\b/i);
  const end = start < 0 ? -1 : html.indexOf("</article>", start);
  const article =
    start < 0 ? html : html.slice(start, end < 0 ? undefined : end);
  const src = (tag: string) =>
    tag.match(/\bsrc\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];
  const video = article.match(/<video\b[\s\S]*?<\/video>/i)?.[0];
  const frame = [...article.matchAll(/<iframe\b[^>]*>/gi)]
    .map(([tag]) => src(tag))
    .find(
      (url) =>
        url &&
        /https:\/\/(?:www\.)?(?:youtube(?:-nocookie)?\.com\/embed\/|player\.vimeo\.com\/video\/)/i.test(
          url,
        ),
    );
  const videoUrl = video ? src(video) : frame;
  if (videoUrl) {
    return apodPictureSchema.parse({
      ...picture,
      title,
      explanation,
      url: plainText(videoUrl),
      media_type: "video",
    });
  }
  // An embedded video without a source is still not an astronomy photograph.
  if (video) throw new Error("NASA video did not have a source");
  const articleImages = [...article.matchAll(/<img\b[^>]*>/gi)]
    .map(([tag]) => src(tag))
    .filter(
      (url): url is string =>
        typeof url === "string" && !isNasaPlaceholder(plainText(url)),
    );
  const imageMeta = [...html.matchAll(/<meta\b[^>]*>/gi)].find(([tag]) =>
    /\bproperty\s*=\s*["']og:image["']/i.test(tag),
  );
  const socialImage = imageMeta?.[0].match(
    /\bcontent\s*=\s*(["'])([\s\S]*?)\1/i,
  )?.[2];
  const image =
    articleImages.find((url) =>
      /\/(?:cds\/apod\/apod|apod\/image)\//i.test(url),
    ) ??
    articleImages[0] ??
    socialImage;
  if (!image || isNasaPlaceholder(plainText(image))) {
    throw new Error("NASA page did not contain an astronomy picture");
  }
  return apodPictureSchema.parse({
    ...picture,
    title,
    explanation,
    url: plainText(image),
    media_type: "image",
  });
}

export async function recoverApodPicture(picture: SpacePicture) {
  const date = apodDateSchema.parse(picture.date).replaceAll("-", "").slice(2);
  let url = new URL(`https://apod.nasa.gov/apod/ap${date}.html`);
  const signal = AbortSignal.timeout(15000);
  for (let redirects = 0; redirects <= 3; redirects++) {
    // Only fixed NASA destinations. The API key is never sent to these pages.
    if (
      url.protocol !== "https:" ||
      !["apod.nasa.gov", "science.nasa.gov"].includes(url.hostname) ||
      url.port ||
      url.username ||
      url.password
    ) {
      throw new Error("Unexpected NASA redirect");
    }
    const response = await fetch(url, { redirect: "manual", signal });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new Error("NASA redirect missing destination");
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) throw new Error("NASA page unavailable");
    const html = await response.text();
    if (html.length > 2_000_000) throw new Error("NASA page too large");
    return parseApodPage(html, picture);
  }
  throw new Error("Too many NASA redirects");
}
