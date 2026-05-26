'use client'

import { InviteeRow } from '@/lib/supabase'

type Props = {
  invitee: InviteeRow
  onEdit: (inv: InviteeRow) => void
  onDelete: (id: string) => void
  onCopyLink: (inv: InviteeRow) => void
  onDownloadQR: (inv: InviteeRow) => void
}

function statusBadge(inv: InviteeRow) {
  if (inv.guests === 0) return { label: 'Kehormatan', bg: '#fff8ec', color: '#d4881a' }
  const map: Record<string, { label: string; bg: string; color: string }> = {
    confirmed: { label: 'Konfirmasi', bg: '#e8f5e9', color: '#2d5a3d' },
    declined:  { label: 'Tidak Hadir', bg: '#fce8e8', color: '#c0392b' },
    pending:   { label: 'Belum RSVP',  bg: '#fff8ec', color: '#f0a500' },
  }
  return map[inv.rsvp_status] ?? map.pending
}

export default function InviteeCard({
  invitee, onEdit, onDelete, onCopyLink, onDownloadQR,
}: Props) {
  const badge = statusBadge(invitee)
  const canQR = invitee.rsvp_status === 'confirmed' && !!invitee.ref

  return (
    <div style={{
      background: 'white',
      border: '0.5px solid #ede5d4',
      borderRadius: 12,
      padding: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <div style={{ fontWeight: 500, fontSize: 15, color: '#1e3d2a', flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
          {invitee.name}
        </div>
        <span style={{
          padding: '3px 10px', borderRadius: 6,
          fontSize: 11, fontWeight: 500,
          background: badge.bg, color: badge.color,
          whiteSpace: 'nowrap',
        }}>
          {badge.label}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, color: '#888' }}>
        <span style={{ fontFamily: 'monospace' }}>{invitee.phone || '—'}</span>
        <span>·</span>
        <span style={{
          padding: '2px 8px', borderRadius: 4,
          fontSize: 10, fontWeight: 500,
          background: invitee.sender === 'vania' ? '#fbeaf0' : '#e8f5e9',
          color: invitee.sender === 'vania' ? '#993556' : '#2d5a3d',
        }}>
          {invitee.sender === 'vania' ? 'Vania' : 'Managam'}
        </span>
        <span>·</span>
        <span>{invitee.guests === 0 ? 'Kehormatan' : `${invitee.guests ?? 1} tamu`}</span>
        {invitee.opened_at && (
          <>
            <span>·</span>
            <span style={{ color: '#2d5a3d' }}>
              ✓ Dibuka {new Date(invitee.opened_at).toLocaleDateString('id')}
            </span>
          </>
        )}
      </div>

      {invitee.notes && (
        <div style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>
          {invitee.notes}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
        <button onClick={() => onEdit(invitee)} style={btnStyle('#1e3d2a', '#d9cdb8')}>Edit</button>
        <button onClick={() => onCopyLink(invitee)} style={btnStyle('#2d5a3d', '#d9cdb8')}>Link</button>
        {canQR && (
          <button onClick={() => onDownloadQR(invitee)} style={btnStyle('#b8965a', '#d9cdb8')}>QR</button>
        )}
        <button onClick={() => onDelete(invitee.id!)} style={btnStyle('#c0392b', '#f5c6c6')}>Hapus</button>
      </div>
    </div>
  )
}

function btnStyle(color: string, border: string): React.CSSProperties {
  return {
    minHeight: 44,
    padding: '10px 16px',
    border: `0.5px solid ${border}`,
    borderRadius: 8,
    background: 'white',
    fontSize: 12,
    fontFamily: 'Cinzel, serif',
    letterSpacing: 1,
    color,
    cursor: 'pointer',
    flex: '1 1 auto',
    minWidth: 64,
  }
}
