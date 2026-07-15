/** Browser stub for node:fs — used only when Vite bundles createGame. */
export function existsSync(_p: string): boolean {
  return false;
}
export function readFileSync(_p: string, _enc?: string): string {
  return "";
}
export function statSync(_p: string): { isDirectory: () => boolean } {
  return { isDirectory: () => true };
}
export default { existsSync, readFileSync, statSync };
