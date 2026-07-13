import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'www.bizdoctor.site',
  description: 'Sistema de Transformación Empresarial con IA'
};

// Se aplica antes de hidratar para evitar el parpadeo claro→oscuro al cargar
// la página cuando el usuario ya había elegido modo oscuro.
const THEME_INIT_SCRIPT = `
(function() {
  try {
    if (localStorage.getItem('bizdoctor-theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: THEME_INIT_SCRIPT le agrega la clase "dark" a
    // <html> antes de que React hidrate (para evitar el parpadeo claro→oscuro),
    // así que el DOM real difiere a propósito del HTML que renderizó el
    // servidor — sin esto, React marca esa diferencia como un error real.
    <html lang="es" suppressHydrationWarning className={poppins.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
