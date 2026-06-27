import { createClient } from '@supabase/supabase-js'

// Ito ang tamang paraan para sa Vercel at GitHub deployment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)