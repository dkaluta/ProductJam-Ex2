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
  hebrew_title: z.string().min(1).max(300),
  hebrew_summary: z.string().min(1).max(3000),
  tags: z.array(z.enum(SPACE_TAGS)).min(1).max(5),
});
