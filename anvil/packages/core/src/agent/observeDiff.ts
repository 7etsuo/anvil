import type { ObserveSnapshot } from "../observe.js";
import type { ObserveDiff } from "./types.js";

/**
 * Diff two observe snapshots — agents should reason on deltas, not full dumps.
 * (SWE-agent / ReAct: observation should be compact and relevant.)
 */
export function observeDiff(
  from: ObserveSnapshot,
  to: ObserveSnapshot,
): ObserveDiff {
  const fromMap = new Map(from.entities.map((e) => [e.id, e]));
  const toMap = new Map(to.entities.map((e) => [e.id, e]));

  const addedEntities: string[] = [];
  const removedEntities: string[] = [];
  const entityHp: ObserveDiff["entityHp"] = [];
  const entityPos: ObserveDiff["entityPos"] = [];

  for (const id of toMap.keys()) {
    if (!fromMap.has(id)) addedEntities.push(id);
  }
  for (const id of fromMap.keys()) {
    if (!toMap.has(id)) removedEntities.push(id);
  }

  for (const [id, te] of toMap) {
    const fe = fromMap.get(id);
    if (!fe) continue;
    if (fe.hp !== te.hp) {
      entityHp.push({ id, from: fe.hp, to: te.hp });
    }
    if (fe.x !== te.x || fe.y !== te.y) {
      entityPos.push({
        id,
        from:
          fe.x !== undefined && fe.y !== undefined
            ? { x: fe.x, y: fe.y }
            : undefined,
        to:
          te.x !== undefined && te.y !== undefined
            ? { x: te.x, y: te.y }
            : undefined,
      });
    }
  }

  const sceneChanged =
    from.scene !== to.scene
      ? { from: from.scene, to: to.scene }
      : undefined;

  const genreChanged =
    JSON.stringify(from.genre) !== JSON.stringify(to.genre);

  const parts: string[] = [];
  if (sceneChanged) {
    parts.push(`scene ${sceneChanged.from}→${sceneChanged.to}`);
  }
  if (addedEntities.length) parts.push(`+entities ${addedEntities.join(",")}`);
  if (removedEntities.length)
    parts.push(`-entities ${removedEntities.join(",")}`);
  if (entityHp.length) {
    parts.push(
      `hp ${entityHp.map((h) => `${h.id}:${h.from}→${h.to}`).join(" ")}`,
    );
  }
  if (entityPos.length) {
    parts.push(`moved ${entityPos.map((p) => p.id).join(",")}`);
  }
  if (genreChanged) parts.push("genre_state_changed");
  if (!parts.length) parts.push("no_material_change");

  return {
    tickFrom: from.tick,
    tickTo: to.tick,
    entityHp,
    entityPos,
    addedEntities,
    removedEntities,
    sceneChanged,
    genreChanged,
    summary: parts.join("; "),
  };
}

/** One-line summary of a snapshot for LLM context (keep short). */
export function observeSummary(snap: ObserveSnapshot): string {
  const player = snap.entities.find((e) => e.tags.includes("player"));
  const enemies = snap.entities.filter((e) => e.tags.includes("enemy"));
  const parts = [
    `scene=${snap.scene}`,
    `tick=${snap.tick}`,
    `entities=${snap.entities.length}`,
    `enemies=${enemies.length}`,
  ];
  if (player) {
    parts.push(
      `player@(${player.x ?? "?"},${player.y ?? "?"}) hp=${player.hp ?? "?"}`,
    );
  }
  const quests = (snap.engine?.questsActive as string[] | undefined) ?? [];
  if (quests.length) parts.push(`quests=${quests.join(",")}`);
  return parts.join(" ");
}
