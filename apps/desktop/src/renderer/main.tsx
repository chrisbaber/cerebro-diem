import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <App />
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

// Listen for IPC events from main process
if (window.electronAPI) {
  window.electronAPI.onQuickCapture(() => {
    // Focus the capture input
    const captureInput = document.querySelector('[data-capture-input]') as HTMLInputElement;
    if (captureInput) {
      captureInput.focus();
    }
  });

  window.electronAPI.onVoiceCapture(() => {
    // Trigger voice capture
    const voiceButton = document.querySelector('[data-voice-capture]') as HTMLButtonElement;
    if (voiceButton) {
      voiceButton.click();
    }
  });
}
