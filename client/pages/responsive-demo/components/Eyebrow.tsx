import styles from "./Eyebrow.module.css";

/** The small green label above a block's title, like "01 · רקע". */
export function Eyebrow({ text }: { text: string }) {
  return <p className={styles.eyebrow}>{text}</p>;
}
