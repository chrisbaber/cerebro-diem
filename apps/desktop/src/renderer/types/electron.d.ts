export interface ElectronAPI {
  getPlatform: () => Promise<string>;
  getVersion: () => Promise<string>;
  onQuickCapture: (callback: () => void) => void;
  onVoiceCapture: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
