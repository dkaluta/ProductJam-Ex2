import type { ReactNode } from "react";
import styles from "./Topic.module.css";

type TopicProps = {
  /** The small purple label, like "השראה". */
  label: string;
  /** The line of text under the label. */
  text: string;
  /** Examples shown under the text: pictures, symbols, type samples. */
  children?: ReactNode;
};

/** A part of the "שפה גרפית" block: a label, a line of text, then examples. */
export function Topic({ label, text, children }: TopicProps) {
  return (
    <div className={styles.topic}>
      <div className={styles.header}>
        <h3 className={styles.label}>{label}</h3>
        <p className={styles.text}>{text}</p>
      </div>
      {children}
    </div>
  );
}
