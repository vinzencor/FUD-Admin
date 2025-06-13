import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qjvrzdcucqwxvajsjefe.supabase.co' 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqdnJ6ZGN1Y3F3eHZhanNqZWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2Mzg1NjYsImV4cCI6MjA2NTIxNDU2Nn0.SJYnlfB-mo0DaWeVoBzWvhvJzFixXVxYh2XDbOMRb1s'
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || ''

// Client for public operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for privileged operations (only use server-side)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})