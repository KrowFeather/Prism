const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1100,
        height: 650,
        frame: false,
        titleBarStyle: 'hidden',
        autoHideMenuBar: true,
        movable: true,
        resizable: true,
        minimizable: true,
        maximizable: true,
        fullscreenable: false,
        useContentSize: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: true
        }
    });
    win.loadURL("http://localhost:3000");
    // 开发模式下自动打开开发者工具
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        win.webContents.openDevTools();
    }

    return win;
};

app.whenReady().then(() => {
    const win = createWindow();
    win.maximize();

    ipcMain.handle('window-minimize', () => {
        if (win) {
            win.minimize();
        }
    });

    ipcMain.handle('window-maximize', () => {
        if (win) {
            if (win.isMaximized()) {
                win.unmaximize();
            } else {
                win.maximize();
            }
        }
    });

    ipcMain.handle('window-is-maximized', () => {
        if (win) {
            return win.isMaximized();
        }
        return false;
    });

    ipcMain.handle('window-close', () => {
        if (win) {
            win.close();
        }
    });

    win.on('maximize', () => {
        win.webContents.send('window-maximized');
    });

    win.on('unmaximize', () => {
        win.webContents.send('window-unmaximized');
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});