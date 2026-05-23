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
  approved?: boolean
}

export interface InviteeRow {
  id?: string
  created_at?: string
  name: string
  phone: string
  rsvp_status: 'pending' | 'confirmed' | 'declined'
  attending?: boolean | null
  guests?: number
  notes?: string
  sender?: 'agam' | 'vania'
  ref?: string
  max_guests?: number | null
  opened_at?: string | null
}

export interface MessageLogRow {
  id?: string
  sent_at?: string
  recipient_count: number
  message: string
  recipients: InviteeRow[]
  status: string
}

export interface PhotoRow {
  name: string
  url: string
}

// ── Invitee lookup by ref (anon) ──────────────────────────────────
export async function fetchInviteeByRef(ref: string): Promise<InviteeRow | null> {
  const { data, error } = await supabase
    .rpc('get_invitee_by_ref', { p_ref: ref })
  if (error || !data?.length) return null
  return data[0] as InviteeRow
}

export async function fetchDefaultMaxGuests(): Promise<number> {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'default_max_guests')
    .single()
  return parseInt(data?.value ?? '2')
}

export function generateRef(): string {
  return Math.random().toString(36).substring(2, 10)
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

// ── Admin proxy ───────────────────────────────────────────────────
// All admin writes route through /api/admin (Cloudflare Pages Function)
// which holds the service_role key and validates ADMIN_SECRET.
async function adminCall<T = unknown>(
  action: string,
  payload?: Record<string, unknown>
): Promise<T> {
  const secret = typeof window !== 'undefined'
    ? sessionStorage.getItem('mv_admin_auth')
    : null
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Secret': secret ?? '',
    },
    body: JSON.stringify({ action, payload }),
  })
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('mv_admin_auth')
      window.location.href = '/admin/login'
    }
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Admin call failed: ${res.status}`)
  }
  const { data } = await res.json()
  return data as T
}

export async function fetchInvitees(): Promise<InviteeRow[]> {
  return (await adminCall<InviteeRow[] | null>('list_invitees')) ?? []
}

export async function upsertInvitee(invitee: InviteeRow) {
  await adminCall('upsert_invitee', invitee as unknown as Record<string, unknown>)
}

export async function deleteInvitee(id: string) {
  await adminCall('delete_invitee', { id })
}

export async function fetchAllWishes(): Promise<WishRow[]> {
  return (await adminCall<WishRow[] | null>('list_all_wishes')) ?? []
}

export async function updateWishApproval(id: string, approved: boolean) {
  await adminCall('update_wish_approval', { id, approved })
}

export async function deleteWish(id: string) {
  await adminCall('delete_wish', { id })
}

export async function logMessage(log: Omit<MessageLogRow, 'id' | 'sent_at'>) {
  await adminCall('log_message', log as unknown as Record<string, unknown>)
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
