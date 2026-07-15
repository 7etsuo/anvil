/** Logical input map (S-CORE §6). */
export class InputMap {
  private actions = new Set<string>();
  private keyToAction = new Map<string, string>();
  private down = new Map<string, boolean>();
  private pressed = new Map<string, boolean>();
  private released = new Map<string, boolean>();
  private prevDown = new Map<string, boolean>();

  defineAction(name: string): void {
    this.actions.add(name);
    if (!this.down.has(name)) this.down.set(name, false);
  }

  bindKey(action: string, code: string): void {
    this.defineAction(action);
    this.keyToAction.set(code, action);
  }

  /** Install default bindings from S-CORE. */
  installDefaults(): void {
    const pairs: [string, string][] = [
      ["move_up", "KeyW"],
      ["move_down", "KeyS"],
      ["move_left", "KeyA"],
      ["move_right", "KeyD"],
      ["confirm", "Space"],
      ["confirm", "Enter"],
      ["cancel", "Escape"],
      ["shoot", "Space"],
      ["end_turn", "KeyE"],
      ["select_enemy_next", "Tab"],
      ["turn_left", "ArrowLeft"],
      ["turn_right", "ArrowRight"],
      ["move_forward", "KeyW"],
      ["move_back", "KeyS"],
      ["skip_cinematic", "Escape"],
    ];
    for (let i = 0; i <= 9; i++) {
      pairs.push([`play_card_${i}`, `Digit${i}`]);
      pairs.push([`choice_${i}`, `Digit${i}`]);
    }
    for (const [action, code] of pairs) {
      this.defineAction(action);
      // last bind wins for shared keys; define both actions still
      this.keyToAction.set(`${code}::${action}`, action);
      // Also map raw code to primary action for browser later
      if (!this.keyToAction.has(code)) this.keyToAction.set(code, action);
    }
    for (const a of this.actions) this.down.set(a, false);
  }

  isDown(action: string): boolean {
    return this.down.get(action) === true;
  }

  isPressed(action: string): boolean {
    return this.pressed.get(action) === true;
  }

  isReleased(action: string): boolean {
    return this.released.get(action) === true;
  }

  setDown(action: string, isDown: boolean): void {
    this.defineAction(action);
    const was = this.prevDown.get(action) === true;
    this.down.set(action, isDown);
    if (isDown && !was) this.pressed.set(action, true);
    if (!isDown && was) this.released.set(action, true);
  }

  /** Call at start of sim step to compute edges from prev frame. */
  beginStep(): void {
    this.pressed.clear();
    this.released.clear();
    for (const [action, isDown] of this.down) {
      const was = this.prevDown.get(action) === true;
      if (isDown && !was) this.pressed.set(action, true);
      if (!isDown && was) this.released.set(action, true);
    }
  }

  /** Call end of sim step — latch current as previous. */
  endFrame(): void {
    this.prevDown = new Map(this.down);
    this.pressed.clear();
    this.released.clear();
  }

  snapshot(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const a of this.actions) out[a] = this.isDown(a);
    return out;
  }

  handleKey(code: string, isDown: boolean): void {
    const action = this.keyToAction.get(code);
    if (action) this.setDown(action, isDown);
  }
}
