import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL fehlt in der .env-Datei.')
}

if (!supabaseKey) {
  throw new Error(
    'VITE_SUPABASE_ANON_KEY fehlt in der .env-Datei.'
  )
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)