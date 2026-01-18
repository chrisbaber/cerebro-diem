import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://epbnucvawcggjmttwwtg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwYm51Y3Zhd2NnZ2ptdHR3d3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2ODMzMjYsImV4cCI6MjA4NDI1OTMyNn0.JUDCiqeTkbZBT2yQw9-lw5w34PKNa_F3FNxiGMeO-EM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
