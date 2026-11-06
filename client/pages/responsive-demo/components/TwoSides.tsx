import styles from "./TwoSides.module.css";

type Side = { title: string; text: string };

/** Two outlined boxes with ⇄ between them: what each side of a match gets. */
export function TwoSides({ start, end }: { start: Side; end: Side }) {
  return (
    <div className={styles.sides}>
      <SideBox {...start} />
      <span className={styles.exchange} aria-hidden="true">
        ⇄
      </span>
      <SideBox {...end} />
    </div>
  );
}

function SideBox({ title, text }: Side) {
  return (
    <div className={styles.side}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.text}>{text}</p>
    </div>
  );
}
