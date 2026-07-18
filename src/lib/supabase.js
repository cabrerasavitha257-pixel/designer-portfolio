import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
export const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || ''
export const cloudEnabled = Boolean(supabaseUrl && supabasePublishableKey)

let supabaseClient

export function getSupabase() {
  if (!cloudEnabled) {
    throw new Error('Supabase 尚未配置，请先设置网站环境变量。')
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  return supabaseClient
}
