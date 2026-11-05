/** Known NASA site artwork used when an article has no social-preview image. */
export function isNasaPlaceholder(value: string) {
  try {
    const path = decodeURIComponent(new URL(value).pathname);
    return /nasa[-_ ]?(?:logo|meatball)|(?:^|\/)news-thumbnail\.(?:png|jpe?g|webp)(?:\/|$)/i.test(
      path,
    );
  } catch {
    return true;
  }
}
