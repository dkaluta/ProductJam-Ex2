import type { SpacePicture } from "@shared/schemas/nasa";
import { useState } from "react";
import { Button } from "../../components";
import { ApiRequestError } from "../../lib/api";
import { LANG } from "../../lib/config";
import { HebrewExplanation } from "./HebrewExplanation";
import { useExplainPicture } from "./hooks";
import styles from "./PictureCard.module.css";

export function PictureCard({ picture }: { picture: SpacePicture }) {
  const explain = useExplainPicture(picture.date);
  const [imageFailed, setImageFailed] = useState(false);
  const explanation =
    explain.data ??
    (picture.hebrew_title && picture.hebrew_summary && picture.tags
      ? {
          hebrew_title: picture.hebrew_title,
          hebrew_summary: picture.hebrew_summary,
          tags: picture.tags,
        }
      : undefined);
  const pendingElsewhere =
    explain.error instanceof ApiRequestError &&
    explain.error.code === "explanation_pending";
  return (
    <article
      className={styles.card}
      aria-labelledby={`picture-${picture.date}`}
    >
      <div className={styles.media}>
        {imageFailed ? (
          <p>
            Image unavailable. You can still read its NASA description below.
          </p>
        ) : (
          <img
            src={picture.url}
            alt={picture.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
      <div className={styles.content}>
        <time dateTime={picture.date} className={styles.date}>
          {new Intl.DateTimeFormat(LANG, {
            dateStyle: "long",
            timeZone: "UTC",
          }).format(new Date(`${picture.date}T00:00:00Z`))}
        </time>
        <h2 id={`picture-${picture.date}`} className={styles.title}>
          {picture.title}
        </h2>
        {picture.copyright ? (
          <p className={styles.credit}>Image credit: {picture.copyright}</p>
        ) : null}
        <details className={styles.source}>
          <summary>NASA description</summary>
          <p>{picture.explanation}</p>
          <a
            href={`https://apod.nasa.gov/apod/ap${picture.date.replaceAll("-", "").slice(2)}.html`}
            target="_blank"
            rel="noreferrer"
          >
            View on NASA APOD ↗
          </a>
        </details>
        <div aria-live="polite" aria-busy={explain.isPending}>
          {explanation ? (
            <HebrewExplanation explanation={explanation} />
          ) : (
            <Button
              variant="secondary"
              loading={explain.isPending}
              onClick={() => explain.mutate()}
            >
              {pendingElsewhere ? "Check explanation" : "Explain in Hebrew"}
            </Button>
          )}
        </div>
        {explain.isError ? (
          <p role="alert" className={styles.error}>
            {explain.error.message}
          </p>
        ) : null}
      </div>
    </article>
  );
}
