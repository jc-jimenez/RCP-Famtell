'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'bizdoctor-theme'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
    } catch {
      // localStorage puede fallar en modo privado — no es crítico, solo no persiste
    }
  }

  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="flex items-center gap-2 text-xs font-medium text-muted hover:text-ink transition-colors"
    >
      <span aria-hidden>{isDark ? '🌙' : '☀️'}</span>
      <span>{isDark ? 'Modo oscuro' : 'Modo claro'}</span>
      <span className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors ${isDark ? 'bg-accent' : 'bg-subtle'}`}>
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-surface shadow-card transition-transform ${
            isDark ? 'translate-x-4' : ''
          }`}
        />
      </span>
    </button>
  )
}
