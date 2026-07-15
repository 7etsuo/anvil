/**
 * Real Electron main process for Anvil games.
 * Set ANVIL_GAME_DIST to a folder containing index.html (Vite dist-web).
 * Optional ANVIL_MANIFEST_JSON for window size/title.
 */
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

function loadManifest() {
  const envPath = process.env.ANVIL_MANIFEST;
  if (envPath && fs.existsSync(envPath)) {
    return JSON.parse(fs.readFileSync(envPath, "utf8"));
  }
  const local = path.join(__dirname, "manifest.json");
  if (fs.existsSync(local)) {
    return JSON.parse(fs.readFileSync(local, "utf8"));
  }
  return {
    title: "Anvil Game",
    window: { width: 1280, height: 720, fullscreen: false },
    webDist: process.env.ANVIL_GAME_DIST || "dist-web",
  };
}

function resolveDist(manifest) {
  const fromEnv = process.env.ANVIL_GAME_DIST;
  if (fromEnv) return path.resolve(fromEnv);
  return path.resolve(__dirname, manifest.webDist || "dist-web");
}

function createWindow() {
  const manifest = loadManifest();
  const dist = resolveDist(manifest);
  const indexHtml = path.join(dist, "index.html");
  if (!fs.existsSync(indexHtml)) {
    console.error(
      `[anvil-desktop] No index.html at ${indexHtml}\n` +
        `Build your game web target, then set ANVIL_GAME_DIST.`,
    );
    app.exit(1);
    return;
  }

  const win = new BrowserWindow({
    width: manifest.window?.width ?? 1280,
    height: manifest.window?.height ?? 720,
    fullscreen: Boolean(manifest.window?.fullscreen),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: manifest.title || "Anvil Game",
    backgroundColor: "#000000",
    show: true,
  });

  win.loadFile(indexHtml);
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
