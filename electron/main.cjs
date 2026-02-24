/**
 * Point d'entrée Electron US-3.6.
 * Lance le serveur Node (dist/app/server.js) avec JOB_JOY_USER_DATA = userData,
 * attend que le serveur réponde, puis ouvre une BrowserWindow sur http://127.0.0.1:PORT.
 * Port 3002 pour Electron afin de coexister avec la version dev (port 3001) sur la même machine.
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const PORT = Number(process.env.ELECTRON_APP_PORT) || 3002;
let serverProcess = null;

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
  win.loadURL(`http://127.0.0.1:${PORT}`);
  win.on('closed', () => { win.destroy(); });
}

app.whenReady().then(async () => {
  const userDataDir = app.getPath('userData');
  const serverPath = getServerPath();
  const env = {
    ...process.env,
    JOB_JOY_USER_DATA: userDataDir,
    PORT: String(PORT),
  };
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

  try {
    await waitForServer(Number(PORT), 15000);
    createWindow();
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
