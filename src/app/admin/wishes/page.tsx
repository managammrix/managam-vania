'use client'
import { useEffect, useState } from 'react'
import {
  fetchAllWishes, updateWishApproval, deleteWish,
  WishRow,
} from '@/lib/supabase'
import { useAdminAuth } from '@/lib/adminAuth'

export default function WishesAdminPage() {
  useAdminAuth()
  const [wishes, setWishes] = useState<WishRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|'approved'|'pending'>('all')

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchAllWishes()
      setWishes(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = wishes.filter(w => {
    if (filter === 'approved') return w.approved
    if (filter === 'pending') return !w.approved
    return true
  })

  const toggle = async (w: WishRow) => {
    await updateWishApproval(w.id!, !w.approved)
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('Hapus ucapan ini?')) return
    await deleteWish(id)
    load()
  }

  return (
    <div>
      <div className="admin-stack-mobile" style={{
        display:'flex', alignItems:'center',
        justifyContent:'space-between', marginBottom:24,
        gap:12,
      }}>
        <h1 style={{
          fontFamily:'Cormorant Garamond,serif',
          fontSize:32, fontStyle:'italic', color:'#1e3d2a',
        }}>Ucapan</h1>
        <div className="admin-pill-row" style={{display:'flex', gap:8}}>
          {(['all','approved','pending'] as const).map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              style={{
                padding:'10px 16px', borderRadius:8,
                border:'0.5px solid #d9cdb8',
                background: filter===f
                  ? '#1e3d2a' : 'white',
                color: filter===f ? 'white' : '#888',
                fontSize:11, cursor:'pointer',
                fontFamily:'Cinzel,serif', letterSpacing:1,
                whiteSpace:'nowrap', minHeight:44,
              }}>
              {f==='all' ? 'SEMUA' :
               f==='approved' ? 'TAMPIL' : 'PENDING'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{color:'#888'}}>Memuat...</p>
      ) : (
        <div style={{
          display:'flex', flexDirection:'column', gap:12,
        }}>
          {filtered.map(w => (
            <div key={w.id} className="admin-stack-mobile" style={{
              background:'white', borderRadius:12,
              padding:'20px 24px',
              border:`0.5px solid ${
                w.approved ? '#d9efd4' : '#f5e6c8'
              }`,
              display:'flex',
              justifyContent:'space-between',
              alignItems:'flex-start', gap:16,
            }}>
              <div style={{flex:1}}>
                <div style={{
                  fontFamily:'Cinzel,serif', fontSize:10,
                  letterSpacing:2,
                  color: w.approved ? '#2d5a3d' : '#b8965a',
                  marginBottom:8,
                  display:'flex',
                  alignItems:'center', gap:8,
                }}>
                  {w.author.toUpperCase()}
                  <span style={{
                    padding:'2px 8px', borderRadius:4,
                    fontSize:10,
                    background: w.approved
                      ? '#e8f5e9' : '#fff3e0',
                    color: w.approved
                      ? '#2d5a3d' : '#f0a500',
                  }}>
                    {w.approved ? 'TAMPIL' : 'PENDING'}
                  </span>
                </div>
                <p style={{
                  fontSize:15, fontStyle:'italic',
                  color:'#3a3a2e', lineHeight:1.7,
                }}>
                  &ldquo;{w.message}&rdquo;
                </p>
                <div style={{
                  fontSize:12, color:'#aaa', marginTop:8,
                }}>
                  {w.created_at ? new Date(w.created_at)
                    .toLocaleString('id') : ''}
                </div>
              </div>
              <div style={{
                display:'flex', gap:8, flexShrink:0, flexWrap:'wrap',
              }}>
                <button onClick={() => toggle(w)}
                  style={{
                    padding:'12px 18px',
                    border:`0.5px solid ${
                      w.approved ? '#f5c6c6' : '#c8e6c9'
                    }`,
                    borderRadius:8, background:'white',
                    fontSize:12, cursor:'pointer',
                    color: w.approved ? '#c0392b' : '#2d5a3d',
                    minHeight:44,
                    fontFamily:'Cinzel,serif', letterSpacing:1,
                  }}>
                  {w.approved ? 'SEMBUNYIKAN' : 'TAMPILKAN'}
                </button>
                <button onClick={() => remove(w.id!)}
                  style={{
                    padding:'12px 18px',
                    border:'0.5px solid #f5c6c6',
                    borderRadius:8, background:'white',
                    fontSize:12, cursor:'pointer',
                    color:'#c0392b',
                    minHeight:44,
                    fontFamily:'Cinzel,serif', letterSpacing:1,
                  }}>HAPUS</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{
              padding:'48px', textAlign:'center',
              color:'#888', background:'white',
              borderRadius:12,
            }}>Tidak ada ucapan.</div>
          )}
        </div>
      )}
    </div>
  )
}
