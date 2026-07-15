/** Browser stub for node:url — never used for real paths in the client. */
export function fileURLToPath(url: string | URL): string {
  const s = typeof url === "string" ? url : url.href;
  if (s.startsWith("file://")) return s.slice("file://".length);
  return s;
}

export function pathToFileURL(p: string): URL {
  return new URL(p, "file://");
}

export default { fileURLToPath, pathToFileURL };
