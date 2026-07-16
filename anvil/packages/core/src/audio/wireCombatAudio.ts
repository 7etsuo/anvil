/**
 * Wire combat / UI / zone events → AudioSystem cues.
 * Games pass a cue map (semantic names) already registered on AudioSystem.
 */

import type { EventBus } from "../events/EventBus.js";
import {
  COMBAT_CRIT,
  COMBAT_HEAL,
  COMBAT_HIT,
  COMBAT_KILL,
  type CombatHealEvent,
  type CombatHitEvent,
  type CombatKillEvent,
} from "../combat/CombatEvents.js";
import type { AudioChannel, AudioSystem } from "./AudioSystem.js";

/** Semantic cue keys → channel when played via this bridge. */
export type CombatAudioCueMap = {
  hit?: string;
  hit_alt?: string;
  crit?: string;
  kill?: string;
  heal?: string;
  swing?: string;
  spell?: string;
  magic?: string;
  explosion?: string;
  pickup?: string;
  ui_click?: string;
  ui_confirm?: string;
  ui_error?: string;
  ui_open?: string;
  ui_close?: string;
  ui_back?: string;
  door_open?: string;
  music_town?: string;
  music_battle?: string;
  music_dungeon?: string;
  music_peaceful?: string;
  music_zen?: string;
  music_calm?: string;
  music_hub?: string;
};

export const DEFAULT_COMBAT_AUDIO_CUES: Required<
  Pick<
    CombatAudioCueMap,
    | "hit"
    | "hit_alt"
    | "crit"
    | "kill"
    | "heal"
    | "swing"
    | "spell"
    | "magic"
    | "pickup"
    | "ui_click"
    | "ui_confirm"
    | "ui_error"
    | "door_open"
    | "music_town"
    | "music_battle"
    | "music_dungeon"
    | "music_peaceful"
    | "music_zen"
    | "music_calm"
    | "music_hub"
  >
> = {
  hit: "hit",
  hit_alt: "hit_alt",
  crit: "swing",
  kill: "explosion",
  heal: "ui_confirm",
  swing: "swing",
  spell: "spell",
  magic: "magic",
  pickup: "pickup",
  ui_click: "ui_click",
  ui_confirm: "ui_confirm",
  ui_error: "ui_error",
  door_open: "door_open",
  music_town: "music_town",
  music_battle: "music_battle",
  music_dungeon: "music_dungeon",
  music_peaceful: "music_peaceful",
  music_zen: "music_zen",
  music_calm: "music_calm",
  music_hub: "music_hub",
};

export type WireCombatAudioOpts = {
  cues?: CombatAudioCueMap;
  /** Alternate hit sound every other hit */
  alternateHits?: boolean;
};

/**
 * Subscribe EventBus combat (+ optional ui/zone) channels to audio.play.
 * Returns unsubscribe.
 */
export function wireCombatAudio(
  events: EventBus,
  audio: AudioSystem,
  opts: WireCombatAudioOpts = {},
): () => void {
  const cues = { ...DEFAULT_COMBAT_AUDIO_CUES, ...opts.cues };
  let hitFlip = false;

  const play = (cue: string | undefined, channel: AudioChannel = "sfx") => {
    if (!cue || !audio.hasCue(cue)) return;
    audio.play(cue, channel);
  };

  const offHit = events.on(COMBAT_HIT, (payload) => {
    const e = payload as CombatHitEvent;
    if (e.crit && cues.crit) {
      play(cues.crit, "sfx");
      return;
    }
    if (opts.alternateHits !== false && cues.hit_alt) {
      hitFlip = !hitFlip;
      play(hitFlip ? cues.hit : cues.hit_alt, "sfx");
    } else {
      play(cues.hit, "sfx");
    }
    // Ability flavor
    if (e.abilityId === "smite" || e.abilityId === "spell") {
      play(cues.spell ?? cues.magic, "sfx");
    }
  });

  const offCrit = events.on(COMBAT_CRIT, () => {
    // hit handler already plays crit when crit flag set; keep for standalone crits
  });

  const offKill = events.on(COMBAT_KILL, (_payload) => {
    void (_payload as CombatKillEvent);
    play(cues.kill, "sfx");
  });

  const offHeal = events.on(COMBAT_HEAL, (_payload) => {
    void (_payload as CombatHealEvent);
    play(cues.heal, "sfx");
  });

  const offUi = events.on("ui:click", () => play(cues.ui_click, "ui"));
  const offUiConfirm = events.on("ui:confirm", () =>
    play(cues.ui_confirm, "ui"),
  );
  const offUiError = events.on("ui:error", () => play(cues.ui_error, "ui"));
  const offUiOpen = events.on("ui:open", () =>
    play(cues.ui_open ?? cues.ui_click, "ui"),
  );
  const offUiClose = events.on("ui:close", () =>
    play(cues.ui_close ?? cues.ui_back ?? cues.ui_click, "ui"),
  );
  const offPickup = events.on("loot:pickup", () => play(cues.pickup, "sfx"));
  const offSwing = events.on("combat:swing", () => play(cues.swing, "sfx"));
  const offDoor = events.on("world:door", () => play(cues.door_open, "sfx"));

  const offMusic = events.on("audio:zone_music", (payload) => {
    const p = payload as { zone?: string; cue?: string };
    if (p.cue) {
      if (audio.hasCue(p.cue)) audio.playMusic(p.cue);
      return;
    }
    const z = (p.zone ?? "").toLowerCase();
    if (
      z.includes("peaceful") ||
      z.includes("zen") ||
      z.includes("calm") ||
      z.includes("title") ||
      z.includes("menu")
    ) {
      playMusic(cues.music_peaceful ?? cues.music_zen ?? cues.music_hub);
    } else if (z.includes("town") || z.includes("hub")) {
      // Prefer calmer hub music when available
      playMusic(
        cues.music_hub ?? cues.music_peaceful ?? cues.music_town,
      );
    } else if (z.includes("dungeon") || z.includes("crypt")) {
      playMusic(cues.music_dungeon);
    } else if (z.includes("ambient") || z.includes("stars")) {
      playMusic(cues.music_calm ?? cues.music_peaceful);
    } else {
      playMusic(cues.music_battle);
    }
  });

  function playMusic(cue: string | undefined) {
    if (!cue || !audio.hasCue(cue)) return;
    audio.playMusic(cue);
  }

  return () => {
    offHit();
    offCrit();
    offKill();
    offHeal();
    offUi();
    offUiConfirm();
    offUiError();
    offUiOpen();
    offUiClose();
    offPickup();
    offSwing();
    offDoor();
    offMusic();
  };
}

/**
 * Install suggested/game-ready cues onto AudioSystem and wire combat bridge.
 * `cues` should already be path-mapped (e.g. getGameReadyAudioCues("audio")).
 */
export function installGameAudio(
  events: EventBus,
  audio: AudioSystem,
  cues: Record<string, string>,
  opts?: WireCombatAudioOpts,
): () => void {
  audio.addCues(cues);
  return wireCombatAudio(events, audio, opts);
}
