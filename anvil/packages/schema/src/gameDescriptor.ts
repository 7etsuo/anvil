import { z } from "zod";

export const AssetPath = z
  .string()
  .min(1)
  .refine((p) => !p.includes("..") && !p.startsWith("/"), {
    message: "Asset path must be relative and must not contain '..'",
  });

export const EntityId = z.string().regex(/^[a-zA-Z0-9_.:-]+$/);

export const GenreEnum = z.enum([
  "none",
  "card",
  "topdown2d",
  "vn",
  "shmup",
  "fps2",
]);

export const ModuleId = z.enum([
  "core",
  "genre-card",
  "genre-topdown2d",
  "genre-vn",
  "genre-shmup",
  "genre-fps2",
  "genre-net",
]);

export const GameYamlSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  version: z.string().default("0.0.0"),
  anvil: z.string().optional(),
  genre: GenreEnum,
  modules: z.array(z.string()).default([]),
  entryScene: z.string().min(1),
  seed: z.number().int().optional(),
  contentRoot: z.string().default("content"),
  assetsRoot: z.string().default("assets"),
  schemaVersion: z.literal(1).default(1),
});

export type GameYaml = z.infer<typeof GameYamlSchema>;
export type Genre = z.infer<typeof GenreEnum>;

/** Auto-append genre module if missing (agent-friendly). */
export function normalizeModules(genre: Genre, modules: string[]): string[] {
  const out = new Set(modules.filter((m) => m !== "core"));
  const genreMod: Record<Genre, string | null> = {
    none: null,
    card: "genre-card",
    topdown2d: "genre-topdown2d",
    vn: "genre-vn",
    shmup: "genre-shmup",
    fps2: "genre-fps2",
  };
  const needed = genreMod[genre];
  if (needed) out.add(needed);
  return [...out];
}
