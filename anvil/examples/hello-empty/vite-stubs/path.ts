/** Minimal path stub for browser. */
export function resolve(...parts: string[]): string {
  return parts.filter(Boolean).join("/").replace(/\/+/g, "/");
}
export function join(...parts: string[]): string {
  return resolve(...parts);
}
export function isAbsolute(p: string): boolean {
  return p.startsWith("/");
}
export const sep = "/";
export function basename(p: string): string {
  return p.split("/").pop() ?? p;
}
export default { resolve, join, isAbsolute, sep, basename };
