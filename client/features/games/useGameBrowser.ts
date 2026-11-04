import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import type { Game } from "@shared/schemas/games";
import { useToast } from "../../components";
import { useGames, useGameActions } from "./hooks";
import { getVisibleGames, type GameView, type GameSort } from "./collection";
import { useMediaQuery } from "../../lib/useMediaQuery";
import type { GameCollectionHandle } from "./GameCollection";
import { LANG } from "../../lib/config";

const phonePortrait = "(max-width: 600px) and (orientation: portrait)";
const actionPanelQuery =
  "(max-width: 600px), (pointer: coarse) and (orientation: landscape)";
export function useGameBrowser() {
  const gamesQuery = useGames();
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { create, abandon } = useGameActions();
  const [actionId, setActionId] = useState<string | null>(null);
  const actionGame = gamesQuery.data?.find((game) => game.id === actionId);
  useEffect(() => {
    const media = window.matchMedia(actionPanelQuery);
    const closeOnRotation = () => {
      if (!media.matches) setActionId(null);
    };
    media.addEventListener("change", closeOnRotation);
    return () => media.removeEventListener("change", closeOnRotation);
  }, []);
  const phone = useMediaQuery(phonePortrait);
  const requestedView = params.get("view");
  const view: GameView =
    requestedView === "list" ||
    requestedView === "covers" ||
    requestedView === "flow"
      ? requestedView
      : phone
        ? "list"
        : "flow";
  const filter = params.get("outcome") ?? "all";
  const sort = params.get("sort") ?? "newest";
  const games = getVisibleGames(gamesQuery.data ?? [], filter, sort, LANG);
  function changeFilter(value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("outcome", value);
      next.delete("selected");
      return next;
    });
  }
  function changeSort(value: GameSort) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("sort", value);
      return next;
    });
  }
  const menuProps = {
    filter,
    sort,
    onFilter: changeFilter,
    onSort: changeSort,
  };
  const selectedIndex = Math.max(
    0,
    games.findIndex((game) => game.id === params.get("selected")),
  );
  const selected = games[selectedIndex];
  const collectionRef = useRef<GameCollectionHandle>(null);
  const previousId = useRef(id);
  const abandoning = gamesQuery.data?.find(
    (game) =>
      game.id === params.get("abandon") && game.outcome === "in_progress",
  );

  useEffect(() => {
    const wasOpen = previousId.current;
    previousId.current = id;
    if (!wasOpen || id) return;
    const frame = requestAnimationFrame(() => {
      collectionRef.current?.focusSelected();
    });
    return () => cancelAnimationFrame(frame);
  }, [id]);

  useEffect(() => {
    document.title = "Tic-tac-toe · Games";
  }, []);

  function select(index: number) {
    const game = games[Math.max(0, Math.min(games.length - 1, index))];
    if (game)
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set("selected", game.id);
          return next;
        },
        { replace: true },
      );
  }
  function activate(game: Game) {
    if (view === "flow" && window.matchMedia(actionPanelQuery).matches) {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set("selected", game.id);
          return next;
        },
        { replace: true },
      );
      setActionId(game.id);
    } else open(game);
  }
  function dismissActions() {
    setActionId(null);
    requestAnimationFrame(() => {
      collectionRef.current?.focusSelected();
    });
  }
  function open(game: Game) {
    const next = new URLSearchParams(params);
    next.set("selected", game.id);
    void navigate(`/games/${game.id}?${next}`);
  }
  function close() {
    void navigate(`/games?${params}`, { replace: true });
  }
  function setAbandon(game?: Game) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (game) next.set("abandon", game.id);
        else next.delete("abandon");
        return next;
      },
      { replace: true },
    );
    abandon.reset();
  }

  function changeView(value: GameView) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("view", value);
      return next;
    });
  }
  function createGame() {
    create.mutate(undefined, {
      onSuccess: (game) => {
        const next = new URLSearchParams(params);
        next.delete("outcome");
        next.delete("abandon");
        next.set("selected", game.id);
        void navigate(`/games/${game.id}?${next}`);
      },
    });
  }
  function confirmAbandon() {
    if (!abandoning) return;
    abandon.mutate(abandoning.id, {
      onSuccess: () => {
        const next = new URLSearchParams(params);
        next.delete("abandon");
        next.delete("selected");
        void navigate(`/games?${next}`, { replace: true });
        toast.add({ title: "Game abandoned" });
      },
    });
  }
  function openActionGame(game: Game) {
    setActionId(null);
    open(game);
  }
  function abandonActionGame(game: Game) {
    setActionId(null);
    setAbandon(game);
  }
  return {
    gamesQuery,
    games,
    id,
    view,
    filter,
    menuProps,
    selectedIndex,
    selected,
    collectionRef,
    create,
    abandon,
    actionGame,
    abandoning,
    select,
    activate,
    open,
    close,
    setAbandon,
    dismissActions,
    changeView,
    createGame,
    confirmAbandon,
    openActionGame,
    abandonActionGame,
  };
}
