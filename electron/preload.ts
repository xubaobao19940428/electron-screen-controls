// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    mouseMove: (x, y) => ipcRenderer.invoke('mouse-move', x, y),
    mouseClick: (button: string) => ipcRenderer.invoke('mouse-click', button),
    keyPress: (key: string) => ipcRenderer.invoke('key-press', key),
    screenShare: () => ipcRenderer.invoke('screen_share'),
    openWindow: (arg: any) => ipcRenderer.invoke('open-window', arg),
});
