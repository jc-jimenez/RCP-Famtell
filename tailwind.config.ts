import type { Config } from 'tailwindcss';

// Todos los tokens se definen como "R G B" (triplete decimal) en CSS vars y se
// envuelven en rgb(var(...) / <alpha-value>) para que las modificadoras de
// opacidad de Tailwind (bg-accent/20, ring-accent/15, etc.) sigan funcionando
// igual que con los hex anteriores. Los valores en sí viven en globals.css
// bajo :root (claro) y .dark (oscuro) — este archivo no cambia visualmente
// nada por sí solo, solo habilita que el toggle de tema los redefina.
function withOpacity(varName: string) {
  return `rgb(var(${varName}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Superficies
        canvas: withOpacity('--color-canvas'),
        surface: withOpacity('--color-surface'),
        'surface-2': withOpacity('--color-surface-2'),
        subtle: withOpacity('--color-subtle'),
        // Texto
        ink: withOpacity('--color-ink'),
        muted: withOpacity('--color-muted'),
        faint: withOpacity('--color-faint'),
        // Marca
        brand: withOpacity('--color-brand'),
        'brand-hover': withOpacity('--color-brand-hover'),
        accent: withOpacity('--color-accent'),
        'accent-soft': withOpacity('--color-accent-soft'),
        // Colores por rol (texto)
        'role-admin': withOpacity('--color-role-admin'),
        'role-consultor': withOpacity('--color-role-consultor'),
        'role-directivo': withOpacity('--color-role-directivo'),
        'role-colaborador': withOpacity('--color-role-colaborador'),
        // Colores por rol (fondo suave del pill) — antes bg-amber-50/bg-emerald-50 crudos
        'role-admin-soft': withOpacity('--color-role-admin-soft'),
        'role-consultor-soft': withOpacity('--color-role-consultor-soft'),
        'role-directivo-soft': withOpacity('--color-role-directivo-soft'),
        'role-colaborador-soft': withOpacity('--color-role-colaborador-soft'),
        // Estados de módulo
        'module-completed': withOpacity('--color-module-completed'),
        'module-active': withOpacity('--color-module-active'),
        'module-pending': withOpacity('--color-module-pending'),
        'module-locked': withOpacity('--color-module-locked'),
        // Agenda Oculta
        'agenda-blue': withOpacity('--color-agenda-blue'),
        'agenda-yellow': withOpacity('--color-agenda-yellow'),
        'agenda-red': withOpacity('--color-agenda-red'),
        // Badges de estado (antes bg-emerald-50/bg-amber-50/etc. crudos en globals.css)
        'badge-success-bg': withOpacity('--color-badge-success-bg'),
        'badge-success-text': withOpacity('--color-badge-success-text'),
        'badge-warning-bg': withOpacity('--color-badge-warning-bg'),
        'badge-warning-text': withOpacity('--color-badge-warning-text'),
        'badge-danger-bg': withOpacity('--color-badge-danger-bg'),
        'badge-danger-text': withOpacity('--color-badge-danger-text'),
        'badge-neutral-bg': withOpacity('--color-badge-neutral-bg'),
        'badge-neutral-text': withOpacity('--color-badge-neutral-text'),
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        'card-hover': '0 4px 12px rgba(16, 24, 40, 0.08)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')]
};

export default config;
