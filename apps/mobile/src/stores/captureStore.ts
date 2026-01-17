import { create } from 'zustand';
import * as api from '@/services/api';
import type { Capture, CaptureSource } from '@cerebro-diem/core';

interface CaptureState {
  isCapturing: boolean;
  isProcessing: boolean;
  lastCapture: Capture | null;
  error: string | null;

  // Voice recording state
  isRecording: boolean;
  recordingDuration: number;

  // Actions
  captureText: (text: string) => Promise<Capture>;
  captureVoice: (audioBase64: string, format?: 'webm' | 'm4a' | 'wav') => Promise<Capture>;
  startRecording: () => void;
  stopRecording: () => void;
  updateRecordingDuration: (duration: number) => void;
  clearError: () => void;
  reset: () => void;
}

export const useCaptureStore = create<CaptureState>((set, get) => ({
  isCapturing: false,
  isProcessing: false,
  lastCapture: null,
  error: null,
  isRecording: false,
  recordingDuration: 0,

  captureText: async (text: string) => {
    set({ isCapturing: true, error: null });
    try {
      // Create capture
      const capture = await api.createCapture({
        raw_text: text,
        source: 'text',
      });

      set({ lastCapture: capture, isCapturing: false, isProcessing: true });

      // Trigger classification (async, don't wait)
      api.classifyCapture(capture.id).catch(err => {
        console.error('Classification failed:', err);
      });

      set({ isProcessing: false });
      return capture;
    } catch (error: any) {
      set({
        isCapturing: false,
        isProcessing: false,
        error: error.message || 'Capture failed',
      });
      throw error;
    }
  },

  captureVoice: async (audioBase64: string, format: 'webm' | 'm4a' | 'wav' = 'm4a') => {
    set({ isCapturing: true, error: null });
    try {
      // Transcribe audio
      const transcribedText = await api.transcribeAudio(audioBase64, format);

      // Create capture with transcribed text
      const capture = await api.createCapture({
        raw_text: transcribedText,
        source: 'voice',
      });

      set({ lastCapture: capture, isCapturing: false, isProcessing: true });

      // Trigger classification (async, don't wait)
      api.classifyCapture(capture.id).catch(err => {
        console.error('Classification failed:', err);
      });

      set({ isProcessing: false });
      return capture;
    } catch (error: any) {
      set({
        isCapturing: false,
        isProcessing: false,
        error: error.message || 'Voice capture failed',
      });
      throw error;
    }
  },

  startRecording: () => {
    set({ isRecording: true, recordingDuration: 0 });
  },

  stopRecording: () => {
    set({ isRecording: false });
  },

  updateRecordingDuration: (duration: number) => {
    set({ recordingDuration: duration });
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      isCapturing: false,
      isProcessing: false,
      lastCapture: null,
      error: null,
      isRecording: false,
      recordingDuration: 0,
    }),
}));
