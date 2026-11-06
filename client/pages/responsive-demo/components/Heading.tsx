import styles from "./Heading.module.css";

type HeadingProps = {
  text: string;
  /** h2 for a block's title, h3 for a sub-heading inside a block. */
  level?: 2 | 3;
  /** "light" for block titles, "accent" (purple) for sub-headings. */
  tone?: "light" | "accent";
};

/** A heading in Fedra Serif, like "קשה למצוא קוסם שאפשר לסמוך עליו". */
export function Heading({ text, level = 2, tone = "light" }: HeadingProps) {
  const Tag = level === 2 ? "h2" : "h3";
  return <Tag className={`${styles.heading} ${styles[tone]}`}>{text}</Tag>;
}
