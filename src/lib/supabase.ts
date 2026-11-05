import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://cggdiqcybxtygaatmapn.supabase.co';
const DEFAULT_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ2RpcWN5Ynh0eWdhYXRtYXBuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzgxMTg5NSwiZXhwIjoyMTA5Mzg3ODk1fQ.vTusUwrQAXZ25Gv34-KM04iOqEusqKll-gnO1MisU4E';
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ2RpcWN5Ynh0eWdhYXRtYXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4MTE4OTUsImV4cCI6MjEwOTM4Nzg5NX0.mjCac0LrzMGCzWkf9pnaRQQ5N8Z7nz6WLTrEpKEa2dk';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  DEFAULT_SERVICE_ROLE_KEY ||
  DEFAULT_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith('http') &&
  supabaseKey &&
  supabaseKey.length > 10
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
