import type { Game } from "@shared/schemas/games";
import { gameTitle } from "./presentation";
import { Button, Dialog } from "../../components";

export function AbandonGameDialog({
  game: abandoning,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  game: Game | undefined;
  pending: boolean;
  error: Error | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={Boolean(abandoning)}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      title={`Abandon ${abandoning ? gameTitle(abandoning) : "game"}?`}
      description="This permanently removes the in-progress game. You won’t be able to continue it."
      footer={
        <>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => onClose()}
          >
            Keep playing
          </Button>
          <Button variant="danger" loading={pending} onClick={onConfirm}>
            Abandon game
          </Button>
        </>
      }
    >
      {error ? (
        <p role="alert">
          {error?.message} Your game is still available. Try again.
        </p>
      ) : null}
    </Dialog>
  );
}
