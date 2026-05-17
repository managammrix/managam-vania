// src/lib/supabase.js
// ─────────────────────────────────────────────────────────────
// Supabase client — reads env vars injected by Cloudflare Pages
// In local dev, create public/.env.local (never commit!)
// ─────────────────────────────────────────────────────────────

const SUPABASE_URL  = window.__ENV__?.SUPABASE_URL  || '';
const SUPABASE_ANON = window.__ENV__?.SUPABASE_ANON || '';

// ── lightweight fetch wrapper (no SDK dependency) ────────────

async function sbFetch(path, options = {}) {
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

// ── RSVP ─────────────────────────────────────────────────────

export async function submitRSVP({ name, phone, attending, guestCount, lang }) {
  return sbFetch('/rest/v1/rsvp', {
    method: 'POST',
    body: JSON.stringify({
      name,
      phone: phone || null,
      attending,
      guest_count: guestCount,
      lang,
    }),
  });
}

// ── WISHES ───────────────────────────────────────────────────

export async function submitWish({ name, message }) {
  return sbFetch('/rest/v1/wishes', {
    method: 'POST',
    body: JSON.stringify({ name, message }),
  });
}

export async function getWishes({ limit = 50 } = {}) {
  return sbFetch(
    `/rest/v1/wishes?approved=eq.true&order=created_at.desc&limit=${limit}`
  );
}

// ── GALLERY ──────────────────────────────────────────────────

export async function getGalleryPhotos() {
  // List from storage bucket directly (public)
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/list/prewedding`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        limit: 18,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      }),
    }
  );
  if (!res.ok) return [];
  const files = await res.json();
  return files
    .filter(f => /\.(jpg|jpeg|png|webp|avif)$/i.test(f.name))
    .map(f => ({
      url: `${SUPABASE_URL}/storage/v1/object/public/prewedding/${f.name}`,
      name: f.name,
      alt: `Foto pra-nikah Managam & Vania`,
    }));
}
