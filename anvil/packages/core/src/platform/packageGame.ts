/**
 * Desktop package manifest for shipping Anvil web builds via packages/desktop.
 */

export interface GamePackageManifest {
  id: string;
  title: string;
  version: string;
  description?: string;
  /** Relative path to built web dist (from desktop package) */
  webDist: string;
  window: {
    width: number;
    height: number;
    fullscreen?: boolean;
  };
  itch?: { channel: string };
  steam?: { appId?: string };
}

export function createPackageManifest(
  partial: Partial<GamePackageManifest> &
    Pick<GamePackageManifest, "id" | "title">,
): GamePackageManifest {
  return {
    id: partial.id,
    title: partial.title,
    version: partial.version ?? "0.1.0",
    description: partial.description,
    webDist: partial.webDist ?? "dist-web",
    window: {
      width: partial.window?.width ?? 1280,
      height: partial.window?.height ?? 720,
      fullscreen: partial.window?.fullscreen ?? false,
    },
    itch: partial.itch,
    steam: partial.steam,
  };
}

/** Write manifest JSON next to a game build. */
export function serializeManifest(m: GamePackageManifest): string {
  return JSON.stringify(m, null, 2);
}
