import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#FFFBFE',
    show: false,
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from the dist folder relative to the asar
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
    // Open dev tools in production to debug white screen
    mainWindow.webContents.openDevTools();
  }

  // Show window when ready, with error handling
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Allow closing the window normally (don't hide to tray on Linux by default)
  mainWindow.on('close', (event) => {
    if (!isQuitting && process.platform === 'darwin') {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray() {
  // Try to load icon from assets, skip tray if not available
  const iconPath = isDev
    ? path.join(__dirname, '../../assets/icon.png')
    : path.join(process.resourcesPath, 'assets/icon.png');

  let icon: Electron.NativeImage;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
    // Resize for tray (16x16 on most platforms)
    icon = icon.resize({ width: 16, height: 16 });
  } else {
    // Create a simple colored icon as fallback
    // Skip tray on Linux if no icon (causes issues)
    if (process.platform === 'linux') {
      console.log('No tray icon found, skipping tray on Linux');
      return;
    }
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Quick Capture',
      accelerator: 'CommandOrControl+Shift+C',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('quick-capture');
      },
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => mainWindow?.show(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Cerebro Diem');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow?.show();
  });
}

function registerGlobalShortcuts() {
  // Global shortcut for quick capture
  globalShortcut.register('CommandOrControl+Shift+C', () => {
    if (mainWindow?.isVisible()) {
      mainWindow?.webContents.send('quick-capture');
    } else {
      mainWindow?.show();
      mainWindow?.webContents.send('quick-capture');
    }
  });

  // Quick voice capture
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    mainWindow?.show();
    mainWindow?.webContents.send('voice-capture');
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC handlers
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('get-version', () => app.getVersion());
