import { z } from "zod";

export const apodDateSchema = z.iso
  .date()
  .refine(
    (date) =>
      date >= "1995-06-16" && date <= new Date().toISOString().slice(0, 10),
    "Date must be within the APOD archive, from 1995-06-16 through today",
  );
export const picturesQuerySchema = z.object({
  count: z.coerce.number().int().min(1).max(20).default(12),
});
export const explainSchema = z.object({ date: apodDateSchema });

export const SPACE_TAGS = [
  "galaxy",
  "nebula",
  "star",
  "planet",
  "moon",
  "sun",
  "earth",
  "asteroid",
  "comet",
  "spaceflight",
  "other",
] as const;
export const explanationSchema = z.object({
  hebrew_title: z.string().trim().min(1).max(300).regex(/[א-ת]/),
  hebrew_summary: z.string().trim().min(1).max(3000).regex(/[א-ת]/),
  tags: z
    .array(z.enum(SPACE_TAGS))
    .min(1)
    .max(5)
    .refine(
      (tags) => new Set(tags).size === tags.length,
      "Tags must be unique",
    ),
});

export const apodPictureSchema = z.object({
  date: apodDateSchema,
  title: z.string().max(1000),
  explanation: z.string().max(30000),
  url: z.url({ protocol: /^https?$/ }),
  media_type: z.enum(["image", "video", "other"]),
  copyright: z.string().max(1000).optional(),
});
export type SpaceExplanation = z.infer<typeof explanationSchema>;
export type SpacePicture = z.infer<typeof apodPictureSchema> &
  Partial<SpaceExplanation>;
