const { app, BrowserWindow, Menu, Tray, nativeImage, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// Production URL: Vercel deployment yoki Cloudflare tunnel
const PROD_URL = process.env.APP_URL || 'https://pizza-chain-app.vercel.app';
const DEV_URL = 'http://localhost:5173';
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let tray;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Pizza Chain - Boshqaruv Tizimi',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
    show: false,
    backgroundColor: '#0f172a',
    titleBarStyle: 'default',
  });

  mainWindow.loadURL(isDev ? DEV_URL : PROD_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (!isDev) autoUpdater.checkForUpdatesAndNotify();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // Custom menu
  const menu = Menu.buildFromTemplate([
    {
      label: 'Pizza Chain',
      submenu: [
        { label: 'Yangilash', click: () => autoUpdater.checkForUpdatesAndNotify() },
        { type: 'separator' },
        { label: 'Chiqish', click: () => { app.isQuitting = true; app.quit(); } },
      ],
    },
    {
      label: 'Ko\'rish',
      submenu: [
        { role: 'reload', label: 'Qayta yuklash' },
        { role: 'forceReload', label: 'To\'liq qayta yuklash' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Asl o\'lcham' },
        { role: 'zoomIn', label: 'Kattalashtirish' },
        { role: 'zoomOut', label: 'Kichiklashtirish' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'To\'liq ekran' },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png'));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('Pizza Chain');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Ochish', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Chiqish', click: () => { app.isQuitting = true; app.quit(); } },
  ]));
  tray.on('double-click', () => mainWindow.show());
}

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else mainWindow.show();
});

// Auto-updater events
autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update-downloaded');
  autoUpdater.quitAndInstall(false, true);
});
