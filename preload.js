const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Functions for main window
    saveData: (data) => ipcRenderer.send('save-data', data),
    loadData: () => ipcRenderer.invoke('load-data'),
    openQuickAdd: () => ipcRenderer.send('open-quick-add'),
    onEventAdded: (callback) => ipcRenderer.on('event-added', (event, ...args) => callback(...args)),

    // --- NEW FUNCTIONS FOR CLEARING DATA ---
    clearData: () => ipcRenderer.send('clear-data'),
    relaunchApp: () => ipcRenderer.send('relaunch-app'),

    // Functions for quick-add window
    addEvent: (eventData) => ipcRenderer.send('add-event', eventData),
    closeQuickAdd: () => ipcRenderer.send('close-quick-add')
});

