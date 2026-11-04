import type { Game } from "@shared/schemas/games";
import type { Position } from "@shared/game/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export function useGames() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["games", user?.id],
    queryFn: ({ signal }) => api<Game[]>("/api/games", { signal }),
    enabled: Boolean(user),
  });
}

export function useGame(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["games", user?.id, id],
    queryFn: ({ signal }) => api<Game>(`/api/games/${id}`, { signal }),
    enabled: Boolean(user && id),
    refetchOnWindowFocus: true,
  });
}

export function useGameActions() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const key = ["games", user?.id];
  function saved(game: Game) {
    cache.setQueryData([...key, game.id], game);
    cache.setQueryData<Game[]>(key, (games) =>
      games?.some((item) => item.id === game.id)
        ? games.map((item) => (item.id === game.id ? game : item))
        : games
          ? [game, ...games]
          : undefined,
    );
    void cache.invalidateQueries({ queryKey: key, exact: true });
  }
  const create = useMutation({
    mutationFn: () => api<Game>("/api/games", { method: "POST", body: {} }),
    onSuccess: saved,
  });
  const move = useMutation({
    mutationFn: ({ id, position }: { id: string; position: Position }) =>
      api<Game>(`/api/games/${id}`, { method: "PUT", body: { position } }),
    onSuccess: saved,
    // A conflict or uncertain response must be reconciled with the server.
    onError: (_error, { id }) => {
      void cache.invalidateQueries({ queryKey: [...key, id] });
      void cache.invalidateQueries({ queryKey: key, exact: true });
    },
  });
  const abandon = useMutation({
    mutationFn: (id: string) =>
      api<void>(`/api/games/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      cache.removeQueries({ queryKey: [...key, id], exact: true });
      cache.setQueryData<Game[]>(key, (games) =>
        games?.filter((game) => game.id !== id),
      );
      void cache.invalidateQueries({ queryKey: key, exact: true });
    },
  });
  return { create, move, abandon };
}
