/**
 * Distance-based volume scaling for SFX (wraps AudioSystem.play).
 */

import type { AudioChannel, AudioSystem } from "./AudioSystem.js";

export type SpatialAudioOpts = {
  /** Full volume within this distance */
  minDistance?: number;
  /** Silent beyond this distance */
  maxDistance?: number;
  /** Extra master scale 0–1 */
  gain?: number;
};

export type ListenerPose = { x: number; y: number };

/**
 * Compute linear falloff volume 0–1.
 */
export function spatialVolume(
  listener: ListenerPose,
  source: { x: number; y: number },
  opts: SpatialAudioOpts = {},
): number {
  const minD = opts.minDistance ?? 40;
  const maxD = opts.maxDistance ?? 420;
  const gain = opts.gain ?? 1;
  const d = Math.hypot(source.x - listener.x, source.y - listener.y);
  if (d <= minD) return gain;
  if (d >= maxD) return 0;
  const t = 1 - (d - minD) / (maxD - minD);
  return Math.max(0, Math.min(1, t * gain));
}

/**
 * Play cue with temporary sfx channel attenuation from distance.
 * Restores channel volume after starting playback.
 */
export function playSpatial(
  audio: AudioSystem,
  cue: string,
  listener: ListenerPose,
  source: { x: number; y: number },
  opts: SpatialAudioOpts & { channel?: AudioChannel } = {},
): number {
  const channel = opts.channel ?? "sfx";
  const vol = spatialVolume(listener, source, opts);
  if (vol <= 0.01) return 0;
  const prev = audio.getVolume(channel);
  audio.setVolume(channel, prev * vol);
  audio.play(cue, channel);
  audio.setVolume(channel, prev);
  return vol;
}
