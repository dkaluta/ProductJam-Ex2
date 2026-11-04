import { useImperativeHandle, useRef, type Ref } from "react";
import type { Game } from "@shared/schemas/games";
import type { GameMenuProps } from "./GameMenu";
import type { GameView } from "./collection";
import { CoverFlowGallery } from "./CoverFlowGallery";
import { GameList } from "./GameList";
import { GameGrid } from "./GameGrid";
import styles from "./GameCollection.module.css";

export interface GameCollectionHandle {
  focusSelected: () => void;
}

export function GameCollection({
  ref,
  games,
  selected,
  selectedIndex,
  view,
  menuProps,
  select,
  activate,
  open,
  onAbandon,
  abandonPending,
}: {
  ref?: Ref<GameCollectionHandle>;
  games: Game[];
  selected: Game;
  selectedIndex: number;
  view: GameView;
  menuProps: GameMenuProps;
  select: (index: number) => void;
  activate: (game: Game) => void;
  open: (game: Game) => void;
  onAbandon: (game: Game) => void;
  abandonPending: boolean;
}) {
  const selectedRow = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const selectedArt = useRef<HTMLButtonElement>(null);
  useImperativeHandle(
    ref,
    () => ({
      focusSelected() {
        [openButton.current, selectedArt.current, selectedRow.current]
          .find((node) => node?.getClientRects().length)
          ?.focus({ preventScroll: true });
      },
    }),
    [],
  );

  return (
    <div className={styles.browser} data-view={view}>
      <div className={styles.flowSlot}>
        <CoverFlowGallery
          games={games}
          selected={selected}
          selectedIndex={selectedIndex}
          select={select}
          activate={activate}
          open={open}
          openButton={openButton}
          abandonPending={abandonPending}
          onAbandon={onAbandon}
        />
      </div>
      <div className={styles.listSlot}>
        <GameList
          games={games}
          selected={selected}
          view={view}
          menuProps={menuProps}
          selectedRow={selectedRow}
          list={list}
          activate={activate}
          select={select}
        />
      </div>
      <div className={styles.gridSlot}>
        <GameGrid
          games={games}
          selected={selected}
          selectedArt={selectedArt}
          activate={activate}
        />
      </div>
    </div>
  );
}
