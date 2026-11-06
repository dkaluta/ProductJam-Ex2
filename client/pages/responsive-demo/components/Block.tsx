import type { ReactNode } from "react";
import styles from "./Block.module.css";
import { Heading } from "./Heading";
import { Eyebrow } from "./Eyebrow";

type BlockProps = {
  /** The green label at the top, like "01 · רקע". */
  tag?: string;
  title?: string;
  children?: ReactNode;
  /**
   * The content as two columns: [start, end]. On desktop they sit side by
   * side (start on the right, in RTL); on phones they simply follow each
   * other, exactly as if they were passed as children.
   */
  columns?: [ReactNode, ReactNode];
  /**
   * Desktop: line the two columns up as rows, so the first part of each
   * column starts together, then the second part of each. Each column must
   * hold exactly two parts.
   */
  rows?: boolean;
  /** Extra class from the page, for example to change the gap. */
  className?: string;
  id?: string;
};

/** One dark card on the page: a label, a title, then whatever is inside. */
export function Block({
  tag,
  title,
  children,
  columns,
  rows = false,
  className = "",
  id,
}: BlockProps) {
  return (
    <section className={`${styles.block} ${className}`} id={id}>
      {tag && <Eyebrow text={tag} />}
      {title && <Heading text={title} />}
      {columns && (
        <div className={`${styles.columns} ${rows ? styles.rows : ""}`}>
          <div className={styles.column}>{columns[0]}</div>
          <div className={styles.column}>{columns[1]}</div>
        </div>
      )}
      {children}
    </section>
  );
}
