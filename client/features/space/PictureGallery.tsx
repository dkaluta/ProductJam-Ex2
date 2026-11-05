import type { SpacePicture } from "@shared/schemas/nasa";
import { PictureCard } from "./PictureCard";
import styles from "./PictureGallery.module.css";

export function PictureGallery({ pictures }: { pictures: SpacePicture[] }) {
  return (
    <div className={styles.gallery}>
      {pictures.map((picture) => (
        <PictureCard key={picture.date} picture={picture} />
      ))}
    </div>
  );
}
