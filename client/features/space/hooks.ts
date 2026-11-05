import { isNasaPlaceholder } from "@shared/space-images";
import type { SpaceExplanation, SpacePicture } from "@shared/schemas/nasa";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export const spaceKeys = {
  pictures: ["space", "pictures", "verified-photos-v2"] as const,
};

export function useSpacePictures() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: spaceKeys.pictures,
    queryFn: ({ signal }) =>
      api<SpacePicture[]>("/api/nasa/pictures?count=4", { signal }),
    select: (pictures) =>
      pictures.filter(
        (picture) =>
          picture.media_type === "image" && !isNasaPlaceholder(picture.url),
      ),
    staleTime: Infinity,
    retry: false,
    refetchOnReconnect: false,
  });
  const loadMore = useMutation({
    retry: false,
    mutationFn: () => {
      const count = Math.min(
        4,
        20 -
          (client.getQueryData<SpacePicture[]>(spaceKeys.pictures)?.length ??
            0),
      );
      return count > 0
        ? api<SpacePicture[]>(`/api/nasa/pictures?count=${count}`)
        : Promise.resolve([]);
    },
    onSuccess: (added) => {
      client.setQueryData<SpacePicture[]>(spaceKeys.pictures, (current = []) =>
        [
          ...new Map(
            [...current, ...added].map((picture) => [picture.date, picture]),
          ).values(),
        ]
          .filter(
            (picture) =>
              picture.media_type === "image" && !isNasaPlaceholder(picture.url),
          )
          .slice(0, 20),
      );
    },
  });
  return { ...query, loadMore };
}

export function useExplainPicture(date: string) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ["space", "explain", date],
    retry: false,
    mutationFn: () =>
      api<SpaceExplanation>("/api/nasa/explain", {
        method: "POST",
        body: { date },
      }),
    onSuccess: (explanation) => {
      client.setQueryData<SpacePicture[]>(spaceKeys.pictures, (pictures) =>
        pictures?.map((picture) =>
          picture.date === date ? { ...picture, ...explanation } : picture,
        ),
      );
    },
  });
}
