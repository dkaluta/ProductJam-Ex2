import { Button, Spinner } from "../../components";
import { PictureGallery } from "../../features/space/PictureGallery";
import { useSpacePictures } from "../../features/space/hooks";
import styles from "./SpacePage.module.css";

export default function SpacePage() {
  const pictures = useSpacePictures();
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Space pictures</h1>
          <p>
            Explore NASA’s astronomy archive. Get a simple explanation in Hebrew
            for any picture.
          </p>
        </div>
        <Button
          onClick={() => {
            pictures.loadMore.reset();
            void pictures.refetch();
          }}
          loading={pictures.isFetching}
          disabled={pictures.loadMore.isPending}
        >
          New pictures
        </Button>
      </header>
      {pictures.isPending ? (
        <div className={styles.status}>
          <Spinner label="Loading space pictures" size="lg" />
        </div>
      ) : null}
      {pictures.isError ? (
        <div className={styles.status}>
          <p role="alert">{pictures.error.message}</p>
          <Button
            variant="secondary"
            onClick={() => void pictures.refetch()}
            loading={pictures.isFetching}
          >
            Try again
          </Button>
        </div>
      ) : null}
      {pictures.data ? (
        <>
          <p className={styles.note} role="status">
            {pictures.data.length} pictures · Up to 20 per selection. Video and
            unavailable entries are skipped.
          </p>
          {pictures.data.length ? (
            <PictureGallery pictures={pictures.data} />
          ) : (
            <p>
              No pictures in this selection. Choose New pictures to try another
              selection.
            </p>
          )}
          {pictures.data.length < 20 ? (
            <div className={styles.more}>
              <Button
                variant="secondary"
                loading={pictures.loadMore.isPending}
                disabled={pictures.isFetching}
                onClick={() => pictures.loadMore.mutate()}
              >
                Load more pictures
              </Button>
              {pictures.loadMore.isError ? (
                <p role="alert">
                  {pictures.loadMore.error.message} Try Load more pictures
                  again.
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
