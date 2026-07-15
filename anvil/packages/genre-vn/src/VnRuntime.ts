import type { InputMap } from "@anvil/core";
import type { VnNode, VnScript } from "./types.js";

export type VnEndedHandler = (endingId: string) => void;

export class VnRuntime {
  private script: VnScript;
  private nodeById = new Map<string, VnNode>();
  private currentId: string;
  private ended = false;
  private endingId: string | null = null;
  private speaker = "";
  private text = "";
  private portrait: string | null = null;
  private bg: string | null = null;
  private choicePrompt: string | null = null;
  private choices: { text: string; next: string }[] = [];
  private history: string[] = [];
  private onEnded?: VnEndedHandler;

  constructor(script: VnScript, onEnded?: VnEndedHandler) {
    this.script = script;
    this.onEnded = onEnded;
    for (const n of script.nodes) this.nodeById.set(n.id, n);
    this.currentId = script.start;
    this.applyNode(this.currentId);
  }

  isEnded(): boolean {
    return this.ended;
  }

  getEndingId(): string | null {
    return this.endingId;
  }

  getCurrentId(): string {
    return this.currentId;
  }

  update(input: InputMap): void {
    if (this.ended) return;
    const node = this.nodeById.get(this.currentId);
    if (!node) return;

    if (node.type === "line") {
      if (input.isPressed("confirm")) this.goto(node.next);
      return;
    }

    if (node.type === "choice") {
      for (let i = 0; i < node.options.length; i++) {
        if (input.isPressed(`choice_${i}`)) {
          const opt = node.options[i]!;
          this.goto(opt.next);
          return;
        }
      }
    }
  }

  /** Force advance (tests / agents). */
  advance(): boolean {
    if (this.ended) return false;
    const node = this.nodeById.get(this.currentId);
    if (!node || node.type !== "line") return false;
    this.goto(node.next);
    return true;
  }

  /** Pick choice by index. */
  choose(index: number): boolean {
    if (this.ended) return false;
    const node = this.nodeById.get(this.currentId);
    if (!node || node.type !== "choice") return false;
    const opt = node.options[index];
    if (!opt) return false;
    this.goto(opt.next);
    return true;
  }

  private goto(id: string): void {
    this.history.push(this.currentId);
    this.applyNode(id);
  }

  private applyNode(id: string): void {
    // Resolve jump chain
    let guard = 0;
    let cur = id;
    while (guard++ < 64) {
      const node = this.nodeById.get(cur);
      if (!node) throw new Error(`VN unknown node: ${cur}`);
      this.currentId = cur;

      if (node.type === "jump") {
        cur = node.next;
        continue;
      }

      if (node.type === "end") {
        this.ended = true;
        this.endingId = node.endingId;
        this.speaker = "";
        this.text = "";
        this.choicePrompt = null;
        this.choices = [];
        this.onEnded?.(node.endingId);
        return;
      }

      if (node.type === "line") {
        this.speaker = node.speaker;
        this.text = node.text;
        if (node.portrait !== undefined) this.portrait = node.portrait;
        if (node.bg !== undefined) this.bg = node.bg;
        this.choicePrompt = null;
        this.choices = [];
        return;
      }

      if (node.type === "choice") {
        this.choicePrompt = node.prompt;
        this.choices = [...node.options];
        this.speaker = "";
        this.text = node.prompt;
        return;
      }
    }
    throw new Error("VN jump cycle detected");
  }

  observeBlob(): Record<string, unknown> {
    return {
      scriptId: this.script.id ?? "script",
      nodeId: this.currentId,
      ended: this.ended,
      endingId: this.endingId,
      speaker: this.speaker,
      text: this.text,
      portrait: this.portrait,
      bg: this.bg,
      choicePrompt: this.choicePrompt,
      choices: this.choices.map((c) => c.text),
      history: [...this.history],
    };
  }
}
