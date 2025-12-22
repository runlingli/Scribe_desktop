import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow;

function createWindow() {
  // development：preload.js in dist/ after compile
  // production：preload.js and main.js are in the same folder
  const preloadPath = app.isPackaged
    ? path.join(__dirname, 'preload.js')
    : path.join(__dirname, '../dist/preload.js');
  
  console.log('Preload path:', preloadPath);
  console.log('Preload exists:', existsSync(preloadPath));
  
  if (!existsSync(preloadPath)) {
    console.error('Preload script not found at:', preloadPath);
    console.error('__dirname:', __dirname);
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true, // hide menu bar
    frame: false,              // close default title bar
    titleBarStyle: 'hidden',  
    webPreferences: {
      nodeIntegration: false, // for safety, disable nodeIntegration
      contextIsolation: true,
      preload: preloadPath,   
      webSecurity: false, // allow loading local source
    },
    fullscreenable: true,
    resizable: true,
    icon: app.isPackaged 
      ? path.join(process.resourcesPath, 'assets/scribe.ico')
      : path.join(__dirname, '../assets/scribe.ico')
  });

  // 监听窗口最大化状态变化
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized-changed', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized-changed', false);
  });

  // 开发环境使用 Vite 开发服务器，生产环境加载打包后的文件
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // 打包后：main.js 在 dist/，index.html 也在 dist/
    // 使用 loadFile 会自动处理相对路径的资源文件
    const indexPath = path.join(__dirname, 'index.html');
    mainWindow.loadFile(indexPath);
    
    // 监听加载错误，帮助调试
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('Failed to load:', errorCode, errorDescription, validatedURL);
    });
  }
}

// IPC 处理：窗口控制
ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
