export function existsSync(_p: string): boolean {
  return false;
}
export function readFileSync(_p: string, _enc?: string): string {
  return "";
}
export function statSync(_p: string): { isDirectory: () => boolean } {
  return { isDirectory: () => true };
}
export function readdirSync(_p: string): string[] {
  return [];
}
export default { existsSync, readFileSync, statSync, readdirSync };
