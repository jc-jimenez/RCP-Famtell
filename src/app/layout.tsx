import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'www.bizdoctor.site',
  description: 'Plataforma SaaS de diagnóstico empresarial con IA'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
