import type { SpaceExplanation } from "@shared/schemas/nasa";
import styles from "./PictureCard.module.css";

export function HebrewExplanation({
  explanation,
}: {
  explanation: SpaceExplanation;
}) {
  return (
    <section
      className={styles.hebrew}
      lang="he"
      dir="rtl"
      aria-label="הסבר בעברית"
    >
      <h3>{explanation.hebrew_title}</h3>
      <p>{explanation.hebrew_summary}</p>
      <ul className={styles.tags} aria-label="תגיות" dir="ltr">
        {explanation.tags.map((tag) => (
          <li key={tag} lang="en">
            {tag}
          </li>
        ))}
      </ul>
    </section>
  );
}
