import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

// Gracefully handle missing env vars
const isConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0

export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

export const isSupabaseConfigured = isConfigured
