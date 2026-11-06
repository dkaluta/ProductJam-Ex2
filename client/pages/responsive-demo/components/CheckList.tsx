import check from "../assets/check.svg";
import styles from "./CheckList.module.css";

/** A list with a green tick before each item, like "מה הם צריכים". */
export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item} className={styles.item}>
          <img className={styles.icon} src={check} alt="" />
          {item}
        </li>
      ))}
    </ul>
  );
}
