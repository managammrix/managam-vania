'use client'
import { useEffect, useState } from 'react'
import {
  fetchInvitees, upsertInvitee, deleteInvitee,
  InviteeRow,
} from '@/lib/supabase'
import { useAdminAuth } from '@/lib/adminAuth'

function getStatusBadge(inv: InviteeRow): {
  label: string; bg: string; color: string
} {
  if (inv.guests === 0) return {
    label: 'Kehormatan', bg: '#fff8ec', color: '#d4881a',
  }
  const map: Record<string, { label: string; bg: string; color: string }> = {
    confirmed: { label: 'Konfirmasi', bg: '#e8f5e9', color: '#2d5a3d' },
    declined:  { label: 'Tidak Hadir', bg: '#fce8e8', color: '#c0392b' },
    pending:   { label: 'Belum RSVP',  bg: '#fff8ec', color: '#f0a500' },
  }
  return map[inv.rsvp_status] ?? map.pending
}

function downloadCsvTemplate() {
  const headers = 'name,phone,guests,notes'
  const example = [
    'Budi Santoso,628111111111,2,Teman kuliah',
    'Ibu Maria,628222222222,0,Rekan jauh',
    'Pastor Yohanes,628333333333,1,',
  ].join('\n')
  const content = headers + '\n' + example
  const blob = new Blob([content], { type:'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'template_tamu_managam_vania.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0628')) return digits.slice(1)
  if (digits.startsWith('628')) return digits
  if (digits.startsWith('08')) return '62' + digits.slice(1)
  if (digits.startsWith('8')) return '62' + digits
  return digits
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
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<Partial<InviteeRow>[]>([])
  const [showPreview, setShowPreview] = useState(false)

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

  async function handleFileImport(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)
    if (lines.length < 2) {
      alert('File CSV kosong atau tidak ada data.')
      e.target.value = ''
      return
    }

    const headers = lines[0]
      .split(',')
      .map(h => h.trim().toLowerCase().replace(/['"]/g, ''))

    const nameIdx = headers.findIndex(h =>
      ['name','nama'].includes(h))
    const phoneIdx = headers.findIndex(h =>
      ['phone','telepon','hp','whatsapp','no','nomor'].includes(h))
    const guestsIdx = headers.findIndex(h =>
      ['guests','tamu','seats','kursi','jumlah'].includes(h))
    const notesIdx = headers.findIndex(h =>
      ['notes','catatan','keterangan'].includes(h))

    if (nameIdx === -1 || phoneIdx === -1) {
      alert('CSV harus punya kolom nama dan phone/telepon')
      e.target.value = ''
      return
    }

    const rows: Partial<InviteeRow>[] = lines.slice(1).map(line => {
      const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g)
        ?.map(c => c.replace(/^"|"$/g, '').trim())
        ?? line.split(',').map(c => c.trim())

      return {
        name: cols[nameIdx] ?? '',
        phone: normalizePhone(cols[phoneIdx] ?? ''),
        guests: guestsIdx >= 0
          ? parseInt(cols[guestsIdx] ?? '1') || 0
          : 1,
        notes: notesIdx >= 0 ? (cols[notesIdx] ?? '') : '',
        rsvp_status: 'pending' as const,
      }
    }).filter(r => r.name && r.phone)

    setPreview(rows)
    setShowPreview(true)
    e.target.value = ''
  }

  async function confirmImport() {
    setImporting(true)
    let imported = 0
    let skipped = 0
    for (const row of preview) {
      try {
        await upsertInvitee(row as InviteeRow)
        imported++
      } catch { skipped++ }
    }
    setShowPreview(false)
    setPreview([])
    setImporting(false)
    alert(`${imported} tamu diimport, ${skipped} dilewati.`)
    load()
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
        gap:12, flexWrap:'wrap',
      }}>
        <h1 style={{
          fontFamily:'Cormorant Garamond,serif',
          fontSize:32, fontStyle:'italic', color:'#1e3d2a',
        }}>Daftar Tamu</h1>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <button
            onClick={downloadCsvTemplate}
            style={{
              padding:'10px 20px',
              border:'0.5px solid #6b8f71',
              borderRadius:8, cursor:'pointer',
              fontFamily:'Cinzel,serif', fontSize:10,
              letterSpacing:2, color:'#6b8f71',
              background:'white',
            }}
          >
            UNDUH TEMPLATE
          </button>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            id="csv-import"
            style={{display:'none'}}
            onChange={handleFileImport}
          />
          <label htmlFor="csv-import" style={{
            padding:'10px 20px',
            border:'0.5px solid #1e3d2a',
            borderRadius:8, cursor:'pointer',
            fontFamily:'Cinzel,serif', fontSize:10,
            letterSpacing:2, color:'#1e3d2a',
            background:'white',
          }}>
            IMPORT CSV
          </label>
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
        flexWrap:'wrap',
      }}>
        <span>{filtered.length} tampil</span>
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
        <span>·</span>
        <span style={{color:'#d4881a'}}>
          {invitees.filter(i => i.guests === 0).length} kehormatan
        </span>
        <span>·</span>
        <span style={{color:'#888', fontWeight:500}}>
          {invitees.filter(i =>
            i.rsvp_status === 'confirmed'
          ).reduce((sum, i) => sum + (i.guests ?? 1), 0)} kursi
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
              {filtered.map(inv => {
                const badge = getStatusBadge(inv)
                return (
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
                      background: badge.bg,
                      color: badge.color,
                    }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{padding:'12px 16px',
                    color:'#888'}}>
                    {inv.guests === 0 ? (
                      <span style={{
                        padding:'2px 8px', borderRadius:4,
                        fontSize:11, background:'#fff8ec',
                        color:'#b8965a', fontWeight:500,
                      }}>Kehormatan</span>
                    ) : inv.guests ?? 1}
                  </td>
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
                )
              })}
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
            <input placeholder="Jumlah tamu (0 = Kehormatan)" type="number"
              value={form.guests ?? 1} style={inp}
              min={0} max={10}
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

      {showPreview && (
        <div style={{
          position:'fixed', inset:0,
          background:'rgba(0,0,0,0.5)',
          display:'flex', alignItems:'center',
          justifyContent:'center', zIndex:500,
        }}>
          <div style={{
            background:'white', borderRadius:16,
            padding:'32px', width:'90%', maxWidth:640,
            maxHeight:'80vh', overflow:'hidden',
            display:'flex', flexDirection:'column',
          }}>
            <h2 style={{
              fontFamily:'Cormorant Garamond,serif',
              fontSize:24, fontStyle:'italic',
              color:'#1e3d2a', marginBottom:8,
            }}>Preview Import</h2>
            <p style={{
              fontSize:13, color:'#888', marginBottom:16,
            }}>
              {preview.length} tamu akan diimport.
              Periksa sebelum konfirmasi.
            </p>
            <div style={{
              overflowY:'auto', flex:1, marginBottom:20,
              border:'0.5px solid #ede5d4', borderRadius:8,
            }}>
              <table style={{
                width:'100%', borderCollapse:'collapse',
                fontSize:13,
              }}>
                <thead>
                  <tr style={{background:'#f8f7f4'}}>
                    {['Nama','Telepon','Tamu','Catatan'].map(h => (
                      <th key={h} style={{
                        padding:'10px 12px', textAlign:'left',
                        fontFamily:'Cinzel,serif', fontSize:10,
                        letterSpacing:2, color:'#6b8f71',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} style={{
                      borderTop:'0.5px solid #f0ece4',
                    }}>
                      <td style={{padding:'10px 12px'}}>
                        {row.name}
                      </td>
                      <td style={{
                        padding:'10px 12px',
                        fontFamily:'monospace',
                        color: row.phone?.startsWith('628')
                          ? '#2d5a3d' : '#c0392b',
                      }}>
                        {row.phone}
                      </td>
                      <td style={{
                        padding:'10px 12px',
                        color: row.guests === 0
                          ? '#b8965a' : '#1e3d2a',
                        fontWeight: row.guests === 0
                          ? 500 : 400,
                      }}>
                        {row.guests === 0
                          ? 'Kehormatan' : row.guests}
                      </td>
                      <td style={{
                        padding:'10px 12px', color:'#888',
                      }}>
                        {row.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{display:'flex', gap:12}}>
              <button
                onClick={() => {
                  setShowPreview(false)
                  setPreview([])
                }}
                style={{
                  flex:1, padding:12,
                  border:'0.5px solid #d9cdb8',
                  borderRadius:8, background:'white',
                  cursor:'pointer', fontSize:13,
                }}>Batal</button>
              <button
                onClick={confirmImport}
                disabled={importing}
                style={{
                  flex:2, padding:12,
                  background:'#1e3d2a', color:'white',
                  border:'none', borderRadius:8,
                  cursor:'pointer',
                  fontFamily:'Cinzel,serif',
                  fontSize:10, letterSpacing:2,
                  opacity: importing ? 0.7 : 1,
                }}>
                {importing
                  ? 'MENGIMPORT...'
                  : `IMPORT ${preview.length} TAMU`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
