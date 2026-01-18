import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  onQuickCapture: (callback: () => void) => {
    ipcRenderer.on('quick-capture', callback);
    return () => ipcRenderer.removeListener('quick-capture', callback);
  },
  onVoiceCapture: (callback: () => void) => {
    ipcRenderer.on('voice-capture', callback);
    return () => ipcRenderer.removeListener('voice-capture', callback);
  },
});

// Type declarations for the exposed API
declare global {
  interface Window {
    electronAPI: {
      getPlatform: () => Promise<string>;
      getVersion: () => Promise<string>;
      onQuickCapture: (callback: () => void) => () => void;
      onVoiceCapture: (callback: () => void) => () => void;
    };
  }
}
