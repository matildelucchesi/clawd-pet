'use strict';

const path = require('node:path');
const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } = require('electron');
const { createPetState } = require('./state.js');
const { startServer } = require('./server.js');
const { createSceneTicker } = require('./ticker.js');
const { PALETTE } = require('../renderer/palette.js');
const { SPRITES } = require('../renderer/sprites.js');

const PORT = 47321;
const SIZE = 160;
const TICK_MS = 500;

let win = null;
let tray = null;
let server = null;

// Builds the tray icon from the first onsen frame (cropped around the creature).
function trayIcon() {
  const frame = SPRITES.onsen_idle.frames[0];
  const x0 = 6;
  const y0 = 6;
  const n = 36;
  const buf = Buffer.alloc(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const ch = frame[y0 + y][x0 + x];
      if (ch === '.') continue;
      const hex = PALETTE['0123456789ab'.indexOf(ch)];
      const o = (y * n + x) * 4;
      buf[o] = parseInt(hex.slice(5, 7), 16); // B
      buf[o + 1] = parseInt(hex.slice(3, 5), 16); // G
      buf[o + 2] = parseInt(hex.slice(1, 3), 16); // R
      buf[o + 3] = 255;
    }
  }
  return nativeImage.createFromBitmap(buf, { width: n, height: n }).resize({ width: 16, height: 16, quality: 'good' });
}

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    x: workArea.x + workArea.width - SIZE - 24,
    y: workArea.y + workArea.height - SIZE - 24,
    transparent: true,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setAlwaysOnTop(true, 'floating');
  // Transparent pixels let clicks through; the renderer turns this off over the pet.
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.showInactive());
  win.on('closed', () => { win = null; });
}

function setupIpc() {
  let drag = null;
  ipcMain.on('over-pet', (_e, over) => {
    if (win && !drag) win.setIgnoreMouseEvents(!over, { forward: true });
  });
  ipcMain.on('drag-start', () => {
    if (!win) return;
    const [wx, wy] = win.getPosition();
    drag = { wx, wy, cursor: screen.getCursorScreenPoint() };
    win.setIgnoreMouseEvents(false);
  });
  ipcMain.on('drag-move', () => {
    if (!win || !drag) return;
    const c = screen.getCursorScreenPoint();
    win.setBounds({ x: drag.wx + c.x - drag.cursor.x, y: drag.wy + c.y - drag.cursor.y, width: SIZE, height: SIZE });
  });
  ipcMain.on('drag-end', () => { drag = null; });
}

async function boot() {
  const petState = createPetState();
  const tick = createSceneTicker({
    petState,
    send: (scene) => { if (win) win.webContents.send('scene', scene); },
  });

  tray = new Tray(trayIcon());
  tray.setToolTip('Pet Claude della spa');
  tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Esci', click: () => app.quit() }]));

  setupIpc();
  createWindow();
  win.webContents.on('did-finish-load', () => tick.resend());

  try {
    server = await startServer({ port: PORT, petState, onChange: () => tick() });
  } catch (err) {
    console.error(`Pet Claude della spa: porta ${PORT} non disponibile (${err.code || err.message}). Il pet resta all'onsen.`);
    tray.setToolTip(`Pet Claude della spa — Porta occupata (${PORT})`);
  }
  setInterval(tick, TICK_MS);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(boot);
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => { if (server) server.close(); });
}
