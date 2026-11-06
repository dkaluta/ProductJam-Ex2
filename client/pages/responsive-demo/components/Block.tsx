import type { ReactNode } from "react";
import styles from "./Block.module.css";
import { Heading } from "./Heading";
import { Eyebrow } from "./Eyebrow";

type BlockProps = {
  /** The green label at the top, like "01 · רקע". */
  tag?: string;
  title?: string;
  children?: ReactNode;
  /** Extra class from the page, for example to change the gap. */
  className?: string;
  id?: string;
};

/** One dark card on the page: a label, a title, then whatever is inside. */
export function Block({
  tag,
  title,
  children,
  className = "",
  id,
}: BlockProps) {
  return (
    <section className={`${styles.block} ${className}`} id={id}>
      {tag && <Eyebrow text={tag} />}
      {title && <Heading text={title} />}
      {children}
    </section>
  );
}
