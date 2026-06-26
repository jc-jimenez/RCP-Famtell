import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Superficies (tema claro)
        canvas: '#F6F5F2',      // fondo de página, off-white cálido
        surface: '#FFFFFF',     // tarjetas
        'surface-2': '#FAFAF8', // paneles internos / métricas
        subtle: '#E8E7E3',      // bordes sutiles
        // Texto
        ink: '#1B2430',         // texto primario
        muted: '#6B7280',       // texto secundario
        faint: '#9CA3AF',       // texto terciario / labels
        // Marca
        brand: '#1E3A5F',       // azul marino — botón primario
        'brand-hover': '#16304E',
        accent: '#2563EB',      // azul brillante — links / activo
        'accent-soft': '#EFF4FF',
        // Colores por rol
        'role-admin': '#B45309',
        'role-consultor': '#2563EB',
        'role-directivo': '#185FA5',
        'role-colaborador': '#0F6E56',
        // Estados de módulo
        'module-completed': '#16A34A',
        'module-active': '#2563EB',
        'module-pending': '#94A3B8',
        'module-locked': '#CBD5E1',
        // Agenda Oculta
        'agenda-blue': '#3B82F6',
        'agenda-yellow': '#F59E0B',
        'agenda-red': '#EF4444',
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
