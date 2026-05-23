'use client'
import { useEffect, useState } from 'react'
import {
  fetchInvitees, upsertInvitee, deleteInvitee,
  InviteeRow,
} from '@/lib/supabase'
import { useAdminAuth } from '@/lib/adminAuth'

const STATUS_COLORS: Record<string, string> = {
  pending: '#f0a500',
  confirmed: '#2d5a3d',
  declined: '#c0392b',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Belum RSVP',
  confirmed: 'Konfirmasi',
  declined: 'Tidak Hadir',
}

export default function InviteesPage() {
  useAdminAuth()
  const [invitees, setInvitees] = useState<InviteeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [editing, setEditing] = useState<InviteeRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<InviteeRow>>({
    name:'', phone:'', rsvp_status:'pending',
    guests:1, notes:'',
  })

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchInvitees()
      setInvitees(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = invitees.filter(i => {
    const matchSearch = i.name.toLowerCase()
      .includes(search.toLowerCase()) ||
      i.phone.includes(search)
    const matchFilter = filter === 'all' ||
      i.rsvp_status === filter
    return matchSearch && matchFilter
  })

  const save = async () => {
    if (!form.name || !form.phone) return
    await upsertInvitee(form as InviteeRow)
    setShowForm(false)
    setForm({ name:'', phone:'',
      rsvp_status:'pending', guests:1, notes:'' })
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('Hapus tamu ini?')) return
    await deleteInvitee(id)
    load()
  }

  const edit = (inv: InviteeRow) => {
    setForm(inv)
    setEditing(inv)
    setShowForm(true)
  }

  const inp: React.CSSProperties = {
    width:'100%', padding:'10px 12px',
    border:'0.5px solid #d9cdb8', borderRadius:8,
    fontSize:14, fontFamily:'inherit',
    outline:'none', marginBottom:12,
  }

  return (
    <div>
      <div style={{
        display:'flex', alignItems:'center',
        justifyContent:'space-between', marginBottom:24,
      }}>
        <h1 style={{
          fontFamily:'Cormorant Garamond,serif',
          fontSize:32, fontStyle:'italic', color:'#1e3d2a',
        }}>Daftar Tamu</h1>
        <button
          onClick={() => {
            setEditing(null)
            setForm({ name:'', phone:'',
              rsvp_status:'pending', guests:1, notes:'' })
            setShowForm(true)
          }}
          style={{
            background:'#1e3d2a', color:'white',
            border:'none', borderRadius:8,
            padding:'10px 20px', cursor:'pointer',
            fontFamily:'Cinzel,serif', fontSize:10,
            letterSpacing:2,
          }}
        >+ TAMBAH TAMU</button>
      </div>

      <div style={{
        display:'flex', gap:12, marginBottom:20,
      }}>
        <input
          placeholder="Cari nama atau nomor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex:1, padding:'10px 14px',
            border:'0.5px solid #d9cdb8', borderRadius:8,
            fontSize:14, outline:'none',
          }}
        />
        {['all','pending','confirmed','declined'].map(f => (
          <button key={f}
            onClick={() => setFilter(f)}
            style={{
              padding:'10px 16px', borderRadius:8,
              border:'0.5px solid #d9cdb8',
              background: filter===f ? '#1e3d2a' : 'white',
              color: filter===f ? 'white' : '#888',
              fontSize:12, cursor:'pointer',
              fontFamily:'Cinzel,serif', letterSpacing:1,
            }}
          >
            {f==='all' ? 'SEMUA' :
             f==='pending' ? 'PENDING' :
             f==='confirmed' ? 'HADIR' : 'TIDAK'}
          </button>
        ))}
      </div>

      <div style={{
        display:'flex', gap:16, marginBottom:20,
        fontSize:13, color:'#888',
      }}>
        <span>{filtered.length} tamu</span>
        <span>·</span>
        <span style={{color:'#2d5a3d'}}>
          {invitees.filter(i =>
            i.rsvp_status==='confirmed'
          ).length} konfirmasi
        </span>
        <span>·</span>
        <span style={{color:'#f0a500'}}>
          {invitees.filter(i =>
            i.rsvp_status==='pending'
          ).length} pending
        </span>
      </div>

      {loading ? (
        <p style={{color:'#888', fontSize:14}}>
          Memuat...
        </p>
      ) : (
        <div style={{
          background:'white', borderRadius:12,
          border:'0.5px solid #ede5d4', overflow:'hidden',
        }}>
          <table style={{
            width:'100%', borderCollapse:'collapse',
            fontSize:14,
          }}>
            <thead>
              <tr style={{
                background:'#f8f7f4',
                borderBottom:'0.5px solid #ede5d4',
              }}>
                {['Nama','Telepon','Status',
                  'Tamu','Catatan',''].map(h => (
                  <th key={h} style={{
                    padding:'12px 16px', textAlign:'left',
                    fontFamily:'Cinzel,serif', fontSize:10,
                    letterSpacing:2, color:'#6b8f71',
                    fontWeight:500,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} style={{
                  borderBottom:'0.5px solid #f0ece4',
                }}>
                  <td style={{padding:'12px 16px',
                    fontWeight:500}}>{inv.name}</td>
                  <td style={{padding:'12px 16px',
                    color:'#888',
                    fontFamily:'monospace'}}>{inv.phone}</td>
                  <td style={{padding:'12px 16px'}}>
                    <span style={{
                      padding:'3px 10px', borderRadius:6,
                      fontSize:11, fontWeight:500,
                      background: (STATUS_COLORS[inv.rsvp_status] ?? '#888') + '20',
                      color: STATUS_COLORS[inv.rsvp_status] ?? '#888',
                    }}>
                      {STATUS_LABELS[inv.rsvp_status] ?? inv.rsvp_status}
                    </span>
                  </td>
                  <td style={{padding:'12px 16px',
                    color:'#888'}}>{inv.guests ?? 1}</td>
                  <td style={{padding:'12px 16px',
                    color:'#888',maxWidth:200,
                    overflow:'hidden',
                    textOverflow:'ellipsis',
                    whiteSpace:'nowrap',
                  }}>{inv.notes ?? '—'}</td>
                  <td style={{padding:'12px 16px'}}>
                    <div style={{
                      display:'flex', gap:8,
                    }}>
                      <button onClick={() => edit(inv)}
                        style={{
                          padding:'4px 12px',
                          border:'0.5px solid #d9cdb8',
                          borderRadius:6, background:'white',
                          fontSize:11, cursor:'pointer',
                          color:'#1e3d2a',
                        }}>Edit</button>
                      <button onClick={() =>
                        remove(inv.id!)}
                        style={{
                          padding:'4px 12px',
                          border:'0.5px solid #f5c6c6',
                          borderRadius:6, background:'white',
                          fontSize:11, cursor:'pointer',
                          color:'#c0392b',
                        }}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{
              padding:'48px', textAlign:'center',
              color:'#888', fontSize:14,
            }}>
              {search ? 'Tidak ada tamu yang cocok.'
               : 'Belum ada tamu. Tambahkan tamu pertama.'}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div style={{
          position:'fixed', inset:0,
          background:'rgba(0,0,0,0.5)',
          display:'flex', alignItems:'center',
          justifyContent:'center', zIndex:500,
        }}>
          <div style={{
            background:'white', borderRadius:16,
            padding:'32px', width:420,
            boxShadow:'0 24px 64px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{
              fontFamily:'Cormorant Garamond,serif',
              fontSize:24, fontStyle:'italic',
              color:'#1e3d2a', marginBottom:24,
            }}>
              {editing ? 'Edit Tamu' : 'Tambah Tamu'}
            </h2>
            <input placeholder="Nama lengkap"
              value={form.name ?? ''} style={inp}
              onChange={e => setForm(f =>
                ({...f, name:e.target.value}))} />
            <input placeholder="Nomor WA (628xxxxxxxxx)"
              value={form.phone ?? ''} style={inp}
              onChange={e => setForm(f =>
                ({...f, phone:e.target.value}))} />
            <select
              value={form.rsvp_status ?? 'pending'}
              onChange={e => setForm(f =>
                ({...f, rsvp_status: e.target.value as
                  InviteeRow['rsvp_status']}))}
              style={{...inp, appearance:'none'}}>
              <option value="pending">Belum RSVP</option>
              <option value="confirmed">Konfirmasi Hadir</option>
              <option value="declined">Tidak Hadir</option>
            </select>
            <input placeholder="Jumlah tamu" type="number"
              value={form.guests ?? 1} style={inp}
              min={1} max={10}
              onChange={e => setForm(f =>
                ({...f, guests:Number(e.target.value)}))} />
            <textarea placeholder="Catatan (opsional)"
              value={form.notes ?? ''}
              onChange={e => setForm(f =>
                ({...f, notes:e.target.value}))}
              style={{...inp, height:80,
                resize:'vertical'}} />
            <div style={{
              display:'flex', gap:12, marginTop:8,
            }}>
              <button onClick={() => setShowForm(false)}
                style={{
                  flex:1, padding:'12px',
                  border:'0.5px solid #d9cdb8',
                  borderRadius:8, background:'white',
                  cursor:'pointer', fontSize:13,
                }}>Batal</button>
              <button onClick={save}
                style={{
                  flex:1, padding:'12px',
                  background:'#1e3d2a', color:'white',
                  border:'none', borderRadius:8,
                  cursor:'pointer',
                  fontFamily:'Cinzel,serif',
                  fontSize:10, letterSpacing:2,
                }}>SIMPAN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
