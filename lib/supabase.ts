import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials not found. Make sure to connect Supabase in Vercel or add them to .env.local")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
