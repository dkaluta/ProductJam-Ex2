import { Link } from "react-router";
import { Card } from "../../components";
import { useAuth } from "../../lib/auth";
import styles from "./HomePage.module.css";

/** The three parts of the exercise, each with the page it lives on. */
const PARTS = [
  {
    number: 1,
    title: "Tic-tac-toe",
    path: "/games",
    description:
      "The four variant: a 4×4 board where four in a row wins. Two players share the screen, and the server replays every saved game to check it.",
    needsLogin: true,
  },
  {
    number: 2,
    title: "Space pictures",
    path: "/space",
    description:
      "Random pictures from NASA's Astronomy Picture of the Day, each one explained in Hebrew by Gemini, with every explanation saved.",
    needsLogin: true,
  },
  {
    number: 3,
    title: "Design to code",
    path: "/responsive-demo",
    description:
      "A designer's mobile screen, built from Figma and made responsive together, up to a wide desktop.",
    needsLogin: false,
  },
];

/** The home page: a short introduction and a link to each part. */
export default function HomePage() {
  const { user } = useAuth();

  return (
    <main>
      <h1>Product Jam · Exercise 2</h1>
      <p className={styles.intro}>
        Three parts of one app: a game the server checks, pictures from NASA
        explained by an LLM, and a design built together with a designer.
      </p>

      <ol className={styles.parts}>
        {PARTS.map((part) => (
          <li key={part.path}>
            <Card className={styles.card}>
              <p className={styles.number}>Part {part.number}</p>
              <h2 className={styles.title}>{part.title}</h2>
              <p className={styles.description}>{part.description}</p>
              <p className={styles.footer}>
                {part.needsLogin && !user ? (
                  <span className={styles.note}>Needs a login</span>
                ) : (
                  <span />
                )}
                <Link to={part.path}>Open part {part.number} →</Link>
              </p>
            </Card>
          </li>
        ))}
      </ol>

      {!user ? (
        <p className={styles.signin}>
          <Link to="/signin">Log in</Link> to play and to see the space
          pictures.
        </p>
      ) : null}
    </main>
  );
}
