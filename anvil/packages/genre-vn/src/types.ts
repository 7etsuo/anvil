export type VnNode =
  | {
      id: string;
      type: "line";
      speaker: string;
      text: string;
      portrait?: string;
      bg?: string;
      next: string;
    }
  | {
      id: string;
      type: "choice";
      prompt: string;
      options: { text: string; next: string }[];
    }
  | { id: string; type: "jump"; next: string }
  | { id: string; type: "end"; endingId: string };

export interface VnScript {
  id?: string;
  start: string;
  nodes: VnNode[];
}
