import { Block } from "./components/Block";
import { CheckList } from "./components/CheckList";
import { Goals } from "./components/Goals";
import { Heading } from "./components/Heading";
import { Eyebrow } from "./components/Eyebrow";
import { Topic } from "./components/Topic";
import { TwoSides } from "./components/TwoSides";
import creatureBird from "./assets/creature-1.png";
import creatureLion from "./assets/creature-2.png";
import crystals from "./assets/crystals.svg";
import portraitOldMan from "./assets/portrait-1.png";
import portraitScarf from "./assets/portrait-2.png";
import portraitBird from "./assets/portrait-3.png";
import potions from "./assets/potions.svg";
import shapeshift from "./assets/shapeshift.svg";
import shield from "./assets/shield.svg";
import tapestry from "./assets/tapestry.png";
import styles from "./ResponsiveDemoPage.module.css";

/** The palette on desktop, in RTL order: the dark background first. */
const PALETTE = [
  { name: "רקע", color: "#0B0A0F" },
  { name: "סגול", color: "#DC9FE9" },
  { name: "אדום", color: "#FF3B27" },
  { name: "ירוק", color: "#BCEB44" },
  { name: "כחול", color: "#648CD2" },
];

/**
 * wizzin - the product spec from the Figma file "חשבונית אפיון", as a page.
 * Phones follow the 440px frame; 900px and up follows "Desktop · 1442".
 */
export default function ResponsiveDemoPage() {
  return (
    <div className={styles.page} dir="rtl" lang="he">
      <main className={styles.content}>
        <header className={styles.header}>
          <Eyebrow text="ג׳אם פיתוח מוצר · הדגמת רספונסיביות" />
          <h1 className={styles.appName}>wizzin</h1>
          <p className={styles.description}>
            רשת מקצועית לקוסמים למציאת שותפים למשימות קסומות
          </p>
          <div className={styles.colors} aria-hidden="true">
            <span className={styles.blue} />
            <span className={styles.green} />
            <span className={styles.red} />
            <span className={styles.purple} />
          </div>
        </header>

        <Block
          tag="01 · רקע"
          id="background"
          className={styles.backgroundBlock}
          columns={[
            <Heading text="קשה למצוא קוסם שאפשר לסמוך עליו" />,
            <div className={styles.problem}>
              <Heading text="הבעיה" level={3} tone="accent" />
              <p className={styles.bodyText}>
                קוסמים מוצאים שותפים למשימה דרך היכרות אישית מצומצמת, מפה לאוזן
                או לוח מודעות.
                <br />
                אין מידע אמין על מקור הידע וההסמכה של קוסם שאינו מוכר ויש צמצום
                ביכולת לבצע משימות מורכבות
              </p>
            </div>,
          ]}
        />

        <Block
          tag="02 · מה המוצר"
          id="description"
          className={styles.descriptionBlock}
          columns={[
            <>
              <Heading text="פלטפורמה למציאת שותפויות קסומות" />
              <p className={styles.bodyText}>
                מקום אחד שבו כל קוסם מציג את התחום שלו, הניסיון וההמלצות, ומוצא
                שותפים שהיכולות שלהם משלימות אותו.
              </p>
            </>,
            <>
              <TwoSides
                start={{
                  title: "מי שמחפש מקבל",
                  text: "שותף מתאים למשימה, עם מידע אמין שאפשר לסמוך עליו",
                }}
                end={{
                  title: "מי שמחפשים מקבל",
                  text: "חשיפה מקצועית מעבר למעגל המכרים והזדמנויות לחיבורים",
                }}
              />
              <Goals
                title="המטרות"
                items={[
                  "לרכז מידע מקצועי אמין במקום אחד",
                  "לייצר הזדמנויות לחיבורים",
                  "לחבר קוסמים עם יכולות משלימות",
                ]}
              />
            </>,
          ]}
        />

        <Block
          tag="03 · קהל היעד"
          id="audience"
          className={styles.audienceBlock}
          columns={[
            <>
              <Heading text="קוסמים וקוסמות שמחפשים שותפים למשימות" />
              {/* On desktop the text comes before the portraits (see CSS). */}
              <div className={styles.portraits}>
                <img
                  className={`${styles.portrait} ${styles.portraitBird}`}
                  src={portraitBird}
                  alt="קוסמת עם ציפור על היד"
                />
                <img
                  className={`${styles.portrait} ${styles.portraitScarf}`}
                  src={portraitScarf}
                  alt="קוסמת עם צעיף לראש"
                />
                <img
                  className={`${styles.portrait} ${styles.portraitOldMan}`}
                  src={portraitOldMan}
                  alt="קוסם מבוגר עם זקן לבן"
                />
              </div>
              <p className={styles.bodyText}>
                מבוגרים טריים של בתי ספר לקסמים ועד בעלי ניסיון והתמחויות
                נדירות.
              </p>
            </>,
            <div className={styles.needs}>
              <Heading text="מה הם צריכים" level={3} tone="accent" />
              <CheckList
                items={[
                  "לזהות במהירות מי מתאים למשימה",
                  "להבין מה היכולות והניסיון שלו",
                  "לדעת אם הוא פנוי לעבודה",
                ]}
              />
            </div>,
          ]}
        />

        <Block
          tag="04 · שפה גרפית"
          id="design"
          className={styles.designBlock}
          columns={[
            <>
              <Topic label="השראה" text="איורים מימי הביניים של יצורי פלא">
                <div className={styles.tapestry}>
                  <img src={tapestry} alt="" />
                </div>
                <div className={styles.creatures}>
                  <div className={styles.lion}>
                    <img src={creatureLion} alt="אריה מימי הביניים" />
                  </div>
                  <div className={styles.bird}>
                    <img src={creatureBird} alt="ציפור פלא מימי הביניים" />
                  </div>
                </div>
              </Topic>
              <Topic
                label="צבעוניות"
                text="אווירה אפלה ומסתורית בשילוב צבעים רוויים."
              >
                {/* Desktop only - the phone design has no palette. */}
                <ul className={styles.palette}>
                  {PALETTE.map(({ name, color }) => (
                    <li key={color} title={name}>
                      <span
                        className={styles.swatch}
                        style={{ backgroundColor: color }}
                      />
                      {color}
                    </li>
                  ))}
                </ul>
              </Topic>
            </>,
            <>
              <Topic
                label="טיפוגרפיה"
                text="פונט גותי ללוגו, בחיבור לימי הביניים. פדרה סריף לכותרות ונרקיס בלוק לשאר הטקסט."
              >
                <div className={styles.typeSamples}>
                  <p className={styles.titleSample}>כותרות · פדרה סריף</p>
                  <p className={styles.bodyText}>טקסט רץ · נרקיס בלוק</p>
                </div>
              </Topic>
              <Topic
                label="סמלים"
                text="לכל תחום קסם סמל וצבע משלו, כדי לזהות במהירות מי מתאים למשימה."
              >
                <ul className={styles.symbols}>
                  <li className={styles.potions}>
                    <img src={potions} alt="שיקויים" />
                  </li>
                  <li className={styles.crystals}>
                    <img src={crystals} alt="קריסטלים" />
                  </li>
                  <li className={styles.shapeshift}>
                    <img src={shapeshift} alt="שינוי צורה" />
                  </li>
                  <li className={styles.protection}>
                    <img className={styles.shield} src={shield} alt="הגנה" />
                  </li>
                </ul>
              </Topic>
            </>,
          ]}
        />
      </main>
    </div>
  );
}
