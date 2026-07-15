/** Logical input map — keyboard, rebinding, gamepad merge. */

export class InputMap {
  private actions = new Set<string>();
  private keyToActions = new Map<string, string[]>();
  private padButtonToActions = new Map<number, string[]>();
  private padAxis = new Map<number, [string, string]>();
  /** Keyboard / script latch */
  private down = new Map<string, boolean>();
  /** This frame gamepad contribution */
  private padDown = new Set<string>();
  private pressed = new Map<string, boolean>();
  private released = new Map<string, boolean>();
  private prevEffective = new Map<string, boolean>();
  private rebindTarget: string | null = null;

  defineAction(name: string): void {
    this.actions.add(name);
    if (!this.down.has(name)) this.down.set(name, false);
  }

  bindKey(action: string, code: string): void {
    this.defineAction(action);
    const list = this.keyToActions.get(code) ?? [];
    if (!list.includes(action)) list.push(action);
    this.keyToActions.set(code, list);
  }

  unbindActionKeys(action: string): void {
    for (const [code, list] of this.keyToActions) {
      const next = list.filter((a) => a !== action);
      if (next.length) this.keyToActions.set(code, next);
      else this.keyToActions.delete(code);
    }
  }

  beginRebind(action: string): void {
    this.defineAction(action);
    this.rebindTarget = action;
  }

  handleRebindKey(code: string): boolean {
    if (!this.rebindTarget) return false;
    this.unbindActionKeys(this.rebindTarget);
    this.bindKey(this.rebindTarget, code);
    this.rebindTarget = null;
    return true;
  }

  isRebinding(): boolean {
    return this.rebindTarget !== null;
  }

  bindPadButton(action: string, buttonIndex: number): void {
    this.defineAction(action);
    const list = this.padButtonToActions.get(buttonIndex) ?? [];
    if (!list.includes(action)) list.push(action);
    this.padButtonToActions.set(buttonIndex, list);
  }

  bindPadAxis(axisIndex: number, negAction: string, posAction: string): void {
    this.defineAction(negAction);
    this.defineAction(posAction);
    this.padAxis.set(axisIndex, [negAction, posAction]);
  }

  installDefaults(): void {
    const pairs: [string, string][] = [
      ["move_up", "KeyW"],
      ["move_down", "KeyS"],
      ["move_left", "KeyA"],
      ["move_right", "KeyD"],
      ["move_forward", "KeyW"],
      ["move_back", "KeyS"],
      ["confirm", "Space"],
      ["confirm", "Enter"],
      ["shoot", "Space"],
      ["cancel", "Escape"],
      ["end_turn", "KeyE"],
      ["select_enemy_next", "Tab"],
      ["turn_left", "ArrowLeft"],
      ["turn_right", "ArrowRight"],
      ["skip_cinematic", "Escape"],
      ["inventory", "KeyI"],
      ["interact", "KeyF"],
      ["map", "KeyM"],
    ];
    for (let i = 0; i <= 9; i++) {
      pairs.push([`play_card_${i}`, `Digit${i}`]);
      pairs.push([`choice_${i}`, `Digit${i}`]);
    }
    for (const [action, code] of pairs) this.bindKey(action, code);
    this.bindPadButton("confirm", 0);
    this.bindPadButton("cancel", 1);
    this.bindPadButton("shoot", 2);
    this.bindPadButton("interact", 3);
    this.bindPadButton("inventory", 8);
    this.bindPadAxis(0, "move_left", "move_right");
    this.bindPadAxis(1, "move_up", "move_down");
    for (const a of this.actions) this.down.set(a, false);
  }

  exportBindings(): {
    keys: Record<string, string[]>;
    padButtons: Record<string, string[]>;
  } {
    const keys: Record<string, string[]> = {};
    for (const [code, acts] of this.keyToActions) keys[code] = [...acts];
    const padButtons: Record<string, string[]> = {};
    for (const [btn, acts] of this.padButtonToActions) {
      padButtons[String(btn)] = [...acts];
    }
    return { keys, padButtons };
  }

  importBindings(data: {
    keys?: Record<string, string[]>;
    padButtons?: Record<string, string[]>;
  }): void {
    if (data.keys) {
      this.keyToActions.clear();
      for (const [code, acts] of Object.entries(data.keys)) {
        this.keyToActions.set(code, [...acts]);
        for (const a of acts) this.defineAction(a);
      }
    }
    if (data.padButtons) {
      this.padButtonToActions.clear();
      for (const [btn, acts] of Object.entries(data.padButtons)) {
        this.padButtonToActions.set(Number(btn), [...acts]);
        for (const a of acts) this.defineAction(a);
      }
    }
  }

  private effective(action: string): boolean {
    return this.down.get(action) === true || this.padDown.has(action);
  }

  isDown(action: string): boolean {
    return this.effective(action);
  }

  isPressed(action: string): boolean {
    return this.pressed.get(action) === true;
  }

  isReleased(action: string): boolean {
    return this.released.get(action) === true;
  }

  beginStep(): void {
    this.pollGamepad();
    this.pressed.clear();
    this.released.clear();
    for (const action of this.actions) {
      const now = this.effective(action);
      const was = this.prevEffective.get(action) === true;
      if (now && !was) this.pressed.set(action, true);
      if (!now && was) this.released.set(action, true);
    }
  }

  setDown(action: string, isDown: boolean): void {
    this.defineAction(action);
    this.down.set(action, isDown);
    // edges also for scripted tests that don't call beginStep first
    const was = this.prevEffective.get(action) === true;
    const now = isDown || this.padDown.has(action);
    if (now && !was) this.pressed.set(action, true);
    if (!now && was) this.released.set(action, true);
  }

  endFrame(): void {
    this.prevEffective = new Map();
    for (const action of this.actions) {
      this.prevEffective.set(action, this.effective(action));
    }
    this.pressed.clear();
    this.released.clear();
  }

  snapshot(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const a of this.actions) out[a] = this.isDown(a);
    return out;
  }

  handleKey(code: string, isDown: boolean): void {
    if (isDown && this.handleRebindKey(code)) return;
    const list = this.keyToActions.get(code);
    if (!list) return;
    for (const action of list) this.setDown(action, isDown);
  }

  private pollGamepad(): void {
    this.padDown.clear();
    if (typeof navigator === "undefined" || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    const pad = pads[0];
    if (!pad) return;
    for (const [btn, acts] of this.padButtonToActions) {
      if (pad.buttons[btn]?.pressed) {
        for (const a of acts) this.padDown.add(a);
      }
    }
    const dead = 0.25;
    for (const [axis, [neg, pos]] of this.padAxis) {
      const v = pad.axes[axis] ?? 0;
      // axis 1 often inverted on pads (up = -1)
      if (axis === 1) {
        if (v < -dead) this.padDown.add(neg);
        if (v > dead) this.padDown.add(pos);
      } else {
        if (v < -dead) this.padDown.add(neg);
        if (v > dead) this.padDown.add(pos);
      }
    }
  }
}
