import styles from "./Goals.module.css";

/** The purple box with the numbered goals. */
export function Goals({ title, items }: { title: string; items: string[] }) {
  return (
    <div className={styles.goals}>
      <h3 className={styles.title}>{title}</h3>
      <ol className={styles.list}>
        {items.map((item, index) => (
          <li key={item} className={styles.item}>
            <span className={styles.number}>{index + 1}</span>
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}
