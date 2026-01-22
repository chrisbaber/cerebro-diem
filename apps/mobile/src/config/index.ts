// Configuration for Cerebro Diem mobile app
// These are public values (safe to include in client-side code)

export const config = {
  supabase: {
    url: 'https://epbnucvawcggjmttwwtg.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwYm51Y3Zhd2NnZ2ptdHR3d3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyMjExMjcsImV4cCI6MjA1Mjc5NzEyN30.xoNvODXRQn2Uxl9SZGEb3zRoNRJciFJCSN-xXNFqAcQ',
  },
  app: {
    name: 'Cerebro Diem',
    version: '1.0.0',
    environment: __DEV__ ? 'development' : 'production',
  },
};

// Export individual values for convenience
export const SUPABASE_URL = config.supabase.url;
export const SUPABASE_ANON_KEY = config.supabase.anonKey;
