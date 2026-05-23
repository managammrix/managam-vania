// Cloudflare Pages Function — proxies admin writes to Supabase.
// Holds SUPABASE_SERVICE_ROLE_KEY server-side, validates ADMIN_SECRET
// on every request. Client sends the PIN via X-Admin-Secret header.

interface Env {
  ADMIN_SECRET: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

interface AdminRequest {
  action: string
  payload?: Record<string, unknown>
}

type PagesFunction<E> = (context: {
  request: Request
  env: E
}) => Response | Promise<Response>

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const secret = request.headers.get('X-Admin-Secret')
  if (!secret || !env.ADMIN_SECRET || secret !== env.ADMIN_SECRET) {
    return json({ error: 'Unauthorized' }, 401)
  }

  let body: AdminRequest
  try {
    body = await request.json() as AdminRequest
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { action, payload = {} } = body

  // verify action just confirms the secret matched (used by login)
  if (action === 'verify') return json({ ok: true })

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Server not configured' }, 500)
  }

  const base = `${env.SUPABASE_URL}/rest/v1`
  const headers = {
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  }

  let res: Response
  try {
    switch (action) {
      case 'list_invitees':
        res = await fetch(`${base}/invitees?select=*&order=created_at.desc`, { headers })
        break
      case 'upsert_invitee':
        res = await fetch(`${base}/invitees`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify(payload),
        })
        break
      case 'delete_invitee': {
        const id = String(payload.id ?? '')
        if (!id) return json({ error: 'Missing id' }, 400)
        res = await fetch(`${base}/invitees?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE', headers,
        })
        break
      }
      case 'list_all_wishes':
        res = await fetch(`${base}/wishes?select=*&order=created_at.desc`, { headers })
        break
      case 'update_wish_approval': {
        const id = String(payload.id ?? '')
        if (!id) return json({ error: 'Missing id' }, 400)
        res = await fetch(`${base}/wishes?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ approved: Boolean(payload.approved) }),
        })
        break
      }
      case 'delete_wish': {
        const id = String(payload.id ?? '')
        if (!id) return json({ error: 'Missing id' }, 400)
        res = await fetch(`${base}/wishes?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE', headers,
        })
        break
      }
      case 'log_message':
        res = await fetch(`${base}/message_log`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify(payload),
        })
        break
      case 'list_message_log':
        res = await fetch(`${base}/message_log?select=message,sent_at&order=sent_at.desc`, { headers })
        break
      default:
        return json({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 502)
  }

  if (!res.ok) {
    const text = await res.text()
    return json({ error: text || res.statusText }, res.status)
  }

  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  return json({ data })
}
