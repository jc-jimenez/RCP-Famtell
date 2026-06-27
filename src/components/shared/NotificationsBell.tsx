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
  sent:    'bg-emerald-400',
  pending: 'bg-amber-400',
  failed:  'bg-rose-400',
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
          border: '1px solid var(--color-subtle)',
          background: open ? 'var(--color-surface-2)' : 'transparent',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: 'var(--color-muted)',
          transition: 'background 0.15s',
        }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 8, height: 8, borderRadius: '50%',
            background: '#ef4444',
            border: '1.5px solid var(--color-surface)',
          }} />
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 320, maxHeight: 420, overflowY: 'auto',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-subtle)',
          borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
          zIndex: 50,
        }}>
          <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--color-subtle)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
              Notificaciones
            </p>
          </div>

          {!loaded ? (
            <p style={{ padding: '20px 16px', fontSize: 13, color: 'var(--color-muted)', textAlign: 'center' }}>
              Cargando…
            </p>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, marginBottom: 8 }}>🔔</p>
              <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>Sin notificaciones</p>
            </div>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {notifications.map(n => (
                <li key={n.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--color-subtle)',
                  transition: 'background 0.1s',
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                  }} className={STATUS_DOT[n.status] ?? 'bg-gray-300'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: 'var(--color-ink)', margin: 0, fontWeight: 500 }}>
                      {TYPE_LABEL[n.notification_type] ?? n.notification_type}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--color-faint)', margin: '2px 0 0' }}>
                      {n.channel === 'email' ? '✉ Email' : '💬 WhatsApp'} · {relativeTime(n.created_at)}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px',
                    padding: '2px 6px', borderRadius: 6,
                    background: n.status === 'sent' ? 'rgba(16,185,129,0.1)' : n.status === 'failed' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                    color: n.status === 'sent' ? '#059669' : n.status === 'failed' ? '#dc2626' : '#d97706',
                    flexShrink: 0,
                  }}>
                    {n.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
