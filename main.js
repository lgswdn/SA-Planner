const { app, BrowserWindow, ipcMain, globalShortcut, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// --- Define path for storing user data ---
const dataPath = path.join(app.getPath('userData'), 'planner-data.json');

let mainWindow;
let quickAddWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        icon: path.join(__dirname, 'icon.ico')
    });
    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools(); // Uncomment for debugging
}

function createQuickAddWindow() {
    if (quickAddWindow) {
        quickAddWindow.focus();
        return;
    }
    quickAddWindow = new BrowserWindow({
        width: 450,
        height: 400,
        parent: mainWindow,
        modal: true,
        show: false,
        frame: false,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
        }
    });
    quickAddWindow.loadFile('quick-add.html');
    quickAddWindow.once('ready-to-show', () => {
        quickAddWindow.show();
    });
    quickAddWindow.on('closed', () => {
        quickAddWindow = null;
    });
}

app.whenReady().then(() => {
    createMainWindow();

    // Register a global shortcut for the quick add tool
    globalShortcut.register('CommandOrControl+Shift+A', createQuickAddWindow);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// --- IPC HANDLERS for data persistence and window management ---

// Save data to file
ipcMain.on('save-data', (event, data) => {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
});

// Load data from file
ipcMain.handle('load-data', () => {
    try {
        if (fs.existsSync(dataPath)) {
            const rawData = fs.readFileSync(dataPath);
            return JSON.parse(rawData);
        }
    } catch (error) {
        console.error("Failed to load data:", error);
    }
    return { events: {}, tasks: [] }; // Return default structure if file doesn't exist or is corrupt
});

// --- NEW: IPC HANDLER TO CLEAR DATA ---
ipcMain.on('clear-data', () => {
    try {
        if (fs.existsSync(dataPath)) {
            fs.unlinkSync(dataPath); // Deletes the file
        }
    } catch (error) {
        console.error("Failed to clear data:", error);
    }
});

// --- NEW: IPC HANDLER TO RELAUNCH THE APP ---
ipcMain.on('relaunch-app', () => {
    app.relaunch();
    app.quit();
});


// Open the quick add window
ipcMain.on('open-quick-add', createQuickAddWindow);

// Add an event from the quick-add window to the main window
ipcMain.on('add-event', (event, eventData) => {
    mainWindow.webContents.send('event-added', eventData);
    if (quickAddWindow) quickAddWindow.close();
});

// Close the quick-add window
ipcMain.on('close-quick-add', () => {
    if (quickAddWindow) quickAddWindow.close();
});

// Remove the default menu
Menu.setApplicationMenu(null);

