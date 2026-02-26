/**
 * Point d'entrée Electron US-3.6.
 * Lance le serveur Node (dist/app/server.js) avec JOB_JOY_USER_DATA = userData,
 * attend que le serveur réponde, puis ouvre une BrowserWindow sur http://127.0.0.1:PORT.
 * Port 3002 pour Electron afin de coexister avec la version dev (port 3001) sur la même machine.
 *
 * US-3.12 Single instance : une seule instance, focus au second lancement.
 * Mises à jour : electron-updater (GitHub Releases), vérification au démarrage (app packagée uniquement).
 */
const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const { pathToFileURL } = require('url');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');

const PORT = Number(process.env.ELECTRON_APP_PORT) || 3002;
let serverProcess = null;
/** Référence à la fenêtre principale (US-3.12) pour focus/restore au second lancement. */
let mainWindow = null;

/** Ouvre les URLs externes dans le navigateur système ; retourne true si l'URL est externe. */
function isExternalAndOpen(url) {
  try {
    const u = new URL(url);
    const isLocal = u.hostname === '127.0.0.1' && Number(u.port) === PORT;
    if (!isLocal) {
      shell.openExternal(url);
      return true;
    }
  } catch (_) {}
  return false;
}

function getServerPath() {
  return path.join(app.getAppPath(), 'dist', 'app', 'server.js');
}

function waitForServer(port, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        if (res.statusCode === 200) resolve();
        else schedule();
      });
      req.on('error', schedule);
      req.end();
    };
    function schedule() {
      if (Date.now() - start > timeoutMs) reject(new Error('Server health timeout'));
      else setTimeout(tick, 100);
    }
    tick();
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  mainWindow = win;
  const wc = win.webContents;
  // Liens externes (target=_blank ou window.open) → navigateur système, pas une nouvelle fenêtre Electron
  wc.setWindowOpenHandler(({ url }) => {
    if (isExternalAndOpen(url)) return { action: 'deny' };
    return { action: 'allow' };
  });
  // Navigation vers une URL externe dans la même fenêtre → ouvrir dans le navigateur et rester dans l'app
  wc.on('will-navigate', (event, url) => {
    if (isExternalAndOpen(url)) event.preventDefault();
  });
  win.loadURL(`http://127.0.0.1:${PORT}`);
  win.on('closed', () => {
    mainWindow = null;
    win.destroy();
  });
}

/** Mises à jour depuis GitHub Releases (app packagée uniquement). Pré-prod : JOY_PREPROD=1 (env) ou fichier userData/.preprod (ex. %APPDATA%\\Job-Joy\\.preprod) → reçoit les Pre-releases. */
function setupAutoUpdater() {
  if (!app.isPackaged) return;
  const fs = require('fs');
  const userDataDir = app.getPath('userData');
  const preprodFile = path.join(userDataDir, '.preprod');
  const isPreprod =
    process.env.JOY_PREPROD === '1' ||
    process.env.PREPROD === '1' ||
    (fs.existsSync && fs.existsSync(preprodFile));
  if (isPreprod) {
    autoUpdater.allowPrerelease = true;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('update-available', (info) => {
    console.log('Mise à jour disponible:', info.version);
  });
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow ?? undefined, {
      type: 'info',
      title: 'Mise à jour prête',
      message: 'Une nouvelle version a été téléchargée. Redémarrer maintenant pour l\'installer ?',
      buttons: ['Redémarrer maintenant', 'Plus tard'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall(false, true);
    });
  });
  autoUpdater.on('error', (err) => {
    console.error('Erreur mise à jour:', err.message);
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 3000);
}

/** US-3.12 : second lancement → focus/restore la fenêtre existante, pas de nouvelle fenêtre. */
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }
  const userDataDir = app.getPath('userData');
  const serverPath = getServerPath();
  process.env.JOB_JOY_USER_DATA = userDataDir;
  process.env.PORT = String(PORT);

  if (app.isPackaged) {
    // En app packagée, process.execPath est l'exe Electron, pas Node : on lance le serveur dans le processus principal.
    try {
      await import(pathToFileURL(serverPath).href);
    } catch (err) {
      console.error('Server load error:', err);
      app.quit();
      return;
    }
  } else {
    // En dev, on spawn Node avec le script serveur.
    const env = { ...process.env, JOB_JOY_USER_DATA: userDataDir, PORT: String(PORT) };
    serverProcess = spawn(process.execPath, [serverPath], {
      env,
      cwd: app.getAppPath(),
      stdio: 'pipe',
    });
    serverProcess.on('error', (err) => {
      console.error('Server spawn error:', err);
      app.quit();
    });
    serverProcess.on('exit', (code, signal) => {
      if (code !== null && code !== 0) console.error('Server exited with code', code);
      serverProcess = null;
    });
  }

  try {
    await waitForServer(Number(PORT), 15000);
    createWindow();
    setupAutoUpdater();
  } catch (err) {
    console.error('Server failed to start:', err);
    if (serverProcess) serverProcess.kill('SIGTERM');
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
  app.quit();
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
});
