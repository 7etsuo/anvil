export function existsSync(_p: string): boolean {
  return false;
}
export function readFileSync(_p: string, _enc?: string): string {
  return "";
}
export function writeFileSync(_p: string, _data: string | Uint8Array): void {
  /* no-op in browser */
}
export function mkdirSync(_p: string, _opts?: unknown): void {
  /* no-op */
}
export function statSync(_p: string): {
  isDirectory: () => boolean;
  size: number;
} {
  return { isDirectory: () => true, size: 0 };
}
export function readdirSync(
  _p: string,
  _opts?: unknown,
): string[] | Array<{ name: string; isDirectory: () => boolean }> {
  return [];
}
export default {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
  readdirSync,
};
