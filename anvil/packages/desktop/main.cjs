/**
 * Production Electron shell for Anvil web game builds.
 *
 * Env:
 *   ANVIL_GAME_DIST  — absolute/relative path to Vite dist (index.html)
 *   ANVIL_MANIFEST   — path to package manifest JSON
 *   ANVIL_DEV_URL    — if set, load URL instead of files (dev)
 */
const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const fs = require("fs");
const path = require("path");

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

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
  // Prefer sibling game dist if present
  const candidates = [
    path.resolve(__dirname, manifest.webDist || "dist-web"),
    path.resolve(__dirname, "../../../games/gravewake/dist-web"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "index.html"))) return c;
  }
  return candidates[0];
}

function buildMenu(win) {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  const manifest = loadManifest();
  const dist = resolveDist(manifest);
  const indexHtml = path.join(dist, "index.html");
  const devUrl = process.env.ANVIL_DEV_URL;

  if (!devUrl && !fs.existsSync(indexHtml)) {
    dialog.showErrorBox(
      "Anvil Desktop",
      `No index.html at:\n${indexHtml}\n\nBuild the game (vite build) or set ANVIL_GAME_DIST / ANVIL_DEV_URL.`,
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
      sandbox: true,
    },
    title: manifest.title || "Anvil Game",
    backgroundColor: "#000000",
    show: false,
  });

  buildMenu(win);

  win.once("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("render-process-gone", (_e, details) => {
    console.error("[anvil-desktop] renderer gone", details);
  });

  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(indexHtml);
  }
}

app.whenReady().then(createWindow);

app.on("second-instance", () => {
  const wins = BrowserWindow.getAllWindows();
  if (wins[0]) {
    if (wins[0].isMinimized()) wins[0].restore();
    wins[0].focus();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
