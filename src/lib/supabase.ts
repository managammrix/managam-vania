import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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
  const { data, error } = await supabase.storage
    .from('prewedding')
    .list('', { limit: 18, sortBy: { column: 'name', order: 'asc' } })
  if (error) throw error
  return (data ?? [])
    .filter(f => /\.(jpg|jpeg|png|webp|avif)$/i.test(f.name))
    .slice(0, 18)
    .map(f => ({
      name: f.name,
      url: supabase.storage.from('prewedding').getPublicUrl(f.name).data.publicUrl,
    }))
}
