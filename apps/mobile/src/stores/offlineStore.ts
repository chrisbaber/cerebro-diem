import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/services/supabase';

const storage = new MMKV({ id: 'offline-store' });

// MMKV adapter for zustand persist
const mmkvStorage = {
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    storage.set(name, value);
  },
  removeItem: (name: string) => {
    storage.delete(name);
  },
};

export interface PendingCapture {
  id: string;
  raw_text: string;
  source: 'voice' | 'text' | 'import';
  audio_base64?: string;
  created_at: string;
}

export interface PendingUpdate {
  id: string;
  table: 'people' | 'projects' | 'ideas' | 'tasks';
  record_id: string;
  updates: Record<string, unknown>;
  created_at: string;
}

interface OfflineState {
  isOnline: boolean;
  pendingCaptures: PendingCapture[];
  pendingUpdates: PendingUpdate[];
  lastSyncAt: string | null;
  isSyncing: boolean;

  // Actions
  setOnline: (isOnline: boolean) => void;
  addPendingCapture: (capture: Omit<PendingCapture, 'id' | 'created_at'>) => void;
  addPendingUpdate: (update: Omit<PendingUpdate, 'id' | 'created_at'>) => void;
  removePendingCapture: (id: string) => void;
  removePendingUpdate: (id: string) => void;
  syncAll: () => Promise<{ synced: number; failed: number }>;
  clearAll: () => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOnline: true,
      pendingCaptures: [],
      pendingUpdates: [],
      lastSyncAt: null,
      isSyncing: false,

      setOnline: (isOnline) => set({ isOnline }),

      addPendingCapture: (capture) => {
        const newCapture: PendingCapture = {
          ...capture,
          id: `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          created_at: new Date().toISOString(),
        };
        set((state) => ({
          pendingCaptures: [...state.pendingCaptures, newCapture],
        }));
      },

      addPendingUpdate: (update) => {
        const newUpdate: PendingUpdate = {
          ...update,
          id: `update_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          created_at: new Date().toISOString(),
        };
        set((state) => ({
          pendingUpdates: [...state.pendingUpdates, newUpdate],
        }));
      },

      removePendingCapture: (id) => {
        set((state) => ({
          pendingCaptures: state.pendingCaptures.filter((c) => c.id !== id),
        }));
      },

      removePendingUpdate: (id) => {
        set((state) => ({
          pendingUpdates: state.pendingUpdates.filter((u) => u.id !== id),
        }));
      },

      syncAll: async () => {
        const state = get();
        if (state.isSyncing || !state.isOnline) {
          return { synced: 0, failed: 0 };
        }

        set({ isSyncing: true });
        let synced = 0;
        let failed = 0;

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            set({ isSyncing: false });
            return { synced: 0, failed: state.pendingCaptures.length + state.pendingUpdates.length };
          }

          // Sync pending captures
          for (const capture of state.pendingCaptures) {
            try {
              // If it's a voice capture with audio, transcribe first
              if (capture.source === 'voice' && capture.audio_base64) {
                const transcribeResponse = await fetch(
                  `${process.env.SUPABASE_URL}/functions/v1/transcribe-audio`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${session.access_token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      audio_base64: capture.audio_base64,
                      format: 'm4a',
                    }),
                  }
                );

                if (!transcribeResponse.ok) {
                  throw new Error('Transcription failed');
                }

                const { text } = await transcribeResponse.json();
                capture.raw_text = text;
              }

              // Create the capture
              const { data, error } = await supabase
                .from('captures')
                .insert({
                  user_id: session.user.id,
                  raw_text: capture.raw_text,
                  source: capture.source,
                  processed: false,
                })
                .select()
                .single();

              if (error) throw error;

              // Trigger classification
              fetch(`${process.env.SUPABASE_URL}/functions/v1/classify-capture`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ capture_id: data.id }),
              }).catch(console.error);

              get().removePendingCapture(capture.id);
              synced++;
            } catch (error) {
              console.error('Failed to sync capture:', error);
              failed++;
            }
          }

          // Sync pending updates
          for (const update of state.pendingUpdates) {
            try {
              const { error } = await supabase
                .from(update.table)
                .update(update.updates)
                .eq('id', update.record_id);

              if (error) throw error;

              get().removePendingUpdate(update.id);
              synced++;
            } catch (error) {
              console.error('Failed to sync update:', error);
              failed++;
            }
          }

          set({ lastSyncAt: new Date().toISOString() });
        } finally {
          set({ isSyncing: false });
        }

        return { synced, failed };
      },

      clearAll: () => {
        set({
          pendingCaptures: [],
          pendingUpdates: [],
          lastSyncAt: null,
        });
      },
    }),
    {
      name: 'cerebro-offline-store',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        pendingCaptures: state.pendingCaptures,
        pendingUpdates: state.pendingUpdates,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);

// Initialize network listener
let unsubscribe: (() => void) | null = null;

export const initNetworkListener = () => {
  if (unsubscribe) return;

  unsubscribe = NetInfo.addEventListener((state) => {
    const isOnline = state.isConnected && state.isInternetReachable;
    useOfflineStore.getState().setOnline(!!isOnline);

    // Auto-sync when coming back online
    if (isOnline) {
      useOfflineStore.getState().syncAll();
    }
  });
};

export const cleanupNetworkListener = () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
};
