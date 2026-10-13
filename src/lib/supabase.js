import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// The app shows a setup banner when these are missing instead of crashing.
export const isConfigured = Boolean(url && key)

export const supabase = createClient(url || 'http://localhost:54321', key || 'public-anon-key')
