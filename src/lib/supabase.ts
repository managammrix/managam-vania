import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bawnvpgjpueqdebjqcjp.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhd252cGdqcHVlcWRlYmpxY2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjI5NzksImV4cCI6MjA5NDU5ODk3OX0.KXqGWTee1_URiWRnHozT8mIJUf4EsYQy80ne3Rtfkyo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Types ──────────────────────────────────────────────────────────
export interface RsvpRow {
  id?: string
  created_at?: string
  name: string
  phone: string
  attending: boolean
  guests: number
}

export interface WishRow {
  id?: string
  created_at?: string
  author: string
  message: string
}

export interface PhotoRow {
  name: string
  url: string
}

// ── RSVP ──────────────────────────────────────────────────────────
export async function submitRsvp(data: Omit<RsvpRow, 'id' | 'created_at'>) {
  const { error } = await supabase.from('rsvp').insert(data)
  if (error) throw error
}

// ── Wishes ────────────────────────────────────────────────────────
export async function fetchWishes(): Promise<WishRow[]> {
  const { data, error } = await supabase
    .from('wishes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data ?? []
}

export async function addWish(author: string, message: string) {
  const { error } = await supabase.from('wishes').insert({ author, message })
  if (error) throw error
}

// ── Gallery ───────────────────────────────────────────────────────
export async function fetchGalleryPhotos(): Promise<PhotoRow[]> {
  try {
    console.log('[gallery] supabaseUrl:', supabaseUrl)
    const { data, error } = await supabase.storage
      .from('prewedding')
      .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } })
    console.log('[gallery] raw .list() response — data:', data, '| error:', error)
    if (error) {
      console.error('[gallery] fetch error:', error.message)
      return []
    }
    const filtered = (data ?? []).filter(f => /\.(jpg|jpeg|png|webp|avif)$/i.test(f.name))
    console.log('[gallery] after extension filter:', filtered.map(f => f.name))
    const result = filtered.slice(0, 18).map(f => {
      const url = supabase.storage.from('prewedding').getPublicUrl(f.name).data.publicUrl
      console.log('[gallery] url:', url)
      return { name: f.name, url }
    })
    return result
  } catch (e) {
    console.error('[gallery] fetch exception:', e)
    return []
  }
}
