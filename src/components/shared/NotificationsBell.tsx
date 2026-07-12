'use client'

import { useEffect, useRef, useState } from 'react'

const TYPE_LABEL: Record<string, string> = {
  invitation:       'Invitación enviada',
  reminder_48h:     'Recordatorio 48h',
  module_completed: 'Módulo completado',
  brief_ready:      'Brief listo',
  checkin_reminder: 'Check-in semanal',
}

const STATUS_DOT: Record<string, string> = {
  sent:    'bg-badge-success-text',
  pending: 'bg-badge-warning-text',
  failed:  'bg-badge-danger-text',
}

const STATUS_CHIP: Record<string, { bg: string; text: string }> = {
  sent:    { bg: 'rgb(var(--color-badge-success-bg))', text: 'rgb(var(--color-badge-success-text))' },
  pending: { bg: 'rgb(var(--color-badge-warning-bg))', text: 'rgb(var(--color-badge-warning-text))' },
  failed:  { bg: 'rgb(var(--color-badge-danger-bg))', text: 'rgb(var(--color-badge-danger-text))' },
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'ahora'
  if (m < 60)  return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24)  return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

export default function NotificationsBell() {
  const [open, setOpen]                   = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loaded, setLoaded]               = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(({ notifications }) => {
        setNotifications(notifications ?? [])
        setLoaded(true)
      })
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = notifications.filter(n => n.status === 'pending').length

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Notificaciones"
        style={{
          position: 'relative',
          width: 34, height: 34,
          borderRadius: 10,
          border: '1px solid rgb(var(--color-subtle))',
          background: open ? 'rgb(var(--color-surface-2))' : 'transparent',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: 'rgb(var(--color-muted))',
          transition: 'background 0.15s',
        }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 8, height: 8, borderRadius: '50%',
            background: 'rgb(var(--color-agenda-red))',
            border: '1.5px solid rgb(var(--color-surface))',
          }} />
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 320, maxHeight: 420, overflowY: 'auto',
          background: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-subtle))',
          borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
          zIndex: 50,
        }}>
          <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid rgb(var(--color-subtle))' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'rgb(var(--color-ink))', margin: 0 }}>
              Notificaciones
            </p>
          </div>

          {!loaded ? (
            <p style={{ padding: '20px 16px', fontSize: 13, color: 'rgb(var(--color-muted))', textAlign: 'center' }}>
              Cargando…
            </p>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, marginBottom: 8 }}>🔔</p>
              <p style={{ fontSize: 13, color: 'rgb(var(--color-muted))' }}>Sin notificaciones</p>
            </div>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {notifications.map(n => {
                const chip = STATUS_CHIP[n.status] ?? STATUS_CHIP.pending
                return (
                  <li key={n.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 16px',
                    borderBottom: '1px solid rgb(var(--color-subtle))',
                    transition: 'background 0.1s',
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                    }} className={STATUS_DOT[n.status] ?? 'bg-faint'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: 'rgb(var(--color-ink))', margin: 0, fontWeight: 500 }}>
                        {TYPE_LABEL[n.notification_type] ?? n.notification_type}
                      </p>
                      <p style={{ fontSize: 11, color: 'rgb(var(--color-faint))', margin: '2px 0 0' }}>
                        {n.channel === 'email' ? '✉ Email' : '💬 WhatsApp'} · {relativeTime(n.created_at)}
                      </p>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px',
                      padding: '2px 6px', borderRadius: 6,
                      background: chip.bg,
                      color: chip.text,
                      flexShrink: 0,
                    }}>
                      {n.status}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
