import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Colores por rol
        'role-admin': '#A32D2D',
        'role-consultor': '#4A2080',
        'role-directivo': '#185FA5',
        'role-colaborador': '#0F6E56',
        // Estados de módulo
        'module-completed': '#0F6E56',
        'module-active': '#185FA5',
        'module-pending': '#64748b',
        'module-locked': '#334155',
        // Agenda Oculta
        'agenda-blue': '#185FA5',
        'agenda-yellow': '#92400e',
        'agenda-red': '#A32D2D',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')]
};

export default config;
