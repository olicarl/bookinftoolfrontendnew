import { createClient } from '@supabase/supabase-js';

// Declare the global runtime config type
declare global {
    interface Window {
        RUNTIME_CONFIG?: {
            SUPABASE_URL?: string;
            SUPABASE_ANON_KEY?: string;
        };
    }
}

// Try to use runtime config first, then fall back to build-time env variables
const supabaseUrl = 
    (typeof window !== 'undefined' && window.RUNTIME_CONFIG?.SUPABASE_URL) || 
    import.meta.env.VITE_SUPABASE_URL;

const supabaseAnonKey = 
    (typeof window !== 'undefined' && window.RUNTIME_CONFIG?.SUPABASE_ANON_KEY) || 
    import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase URL or Anon Key. Check your .env file or runtime configuration.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 