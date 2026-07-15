/**
 * Server-side validation / rate limits for multiplayer.
 * Clients send INPUT only — never position/hp.
 */

/** Actions the server will accept from clients. */
export const ALLOWED_INPUT_ACTIONS = new Set([
  "move_up",
  "move_down",
  "move_left",
  "move_right",
  "move_forward",
  "move_back",
  "shoot",
  "confirm",
  "interact",
  "cancel",
]);

export interface InputMessage {
  actions?: unknown;
  seq?: unknown;
}

export interface ValidatedInput {
  actions: string[];
  seq: number;
}

export function validateInputMessage(
  raw: unknown,
): { ok: true; value: ValidatedInput } | { ok: false; reason: string } {
  if (raw === null || typeof raw !== "object") {
    return { ok: false, reason: "not_object" };
  }
  const msg = raw as InputMessage;
  if (!Array.isArray(msg.actions)) {
    return { ok: false, reason: "actions_not_array" };
  }
  if (msg.actions.length > 16) {
    return { ok: false, reason: "too_many_actions" };
  }
  const actions: string[] = [];
  for (const a of msg.actions) {
    if (typeof a !== "string" || a.length > 32) {
      return { ok: false, reason: "bad_action" };
    }
    if (!ALLOWED_INPUT_ACTIONS.has(a)) {
      continue; // drop unknown — do not kick for extras
    }
    if (!actions.includes(a)) actions.push(a);
  }
  const seq =
    typeof msg.seq === "number" && Number.isFinite(msg.seq)
      ? Math.floor(msg.seq)
      : 0;
  return { ok: true, value: { actions, seq } };
}

export interface RateLimitState {
  windowStartMs: number;
  count: number;
}

/** Sliding window: max N messages per windowMs. */
export function rateLimitAllow(
  state: RateLimitState,
  nowMs: number,
  maxPerWindow: number,
  windowMs: number,
): boolean {
  if (nowMs - state.windowStartMs > windowMs) {
    state.windowStartMs = nowMs;
    state.count = 0;
  }
  state.count += 1;
  return state.count <= maxPerWindow;
}

export type AuthValidator = (
  options: Record<string, unknown>,
) => Promise<{ ok: true; name?: string; userId?: string } | { ok: false; reason: string }>;

/** Default: require non-empty name, optional token presence check hook. */
export const defaultAuthValidator: AuthValidator = async (options) => {
  const name =
    typeof options.name === "string" ? options.name.slice(0, 24) : "Player";
  if (name.length < 1) return { ok: false, reason: "bad_name" };
  // If token field present, must be non-empty string (games replaces with real JWT verify)
  if ("token" in options) {
    if (typeof options.token !== "string" || options.token.length < 8) {
      return { ok: false, reason: "bad_token" };
    }
  }
  return { ok: true, name, userId: typeof options.userId === "string" ? options.userId : undefined };
};
