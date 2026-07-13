// Logomark de BizDoctor.site: dos corazones-lazo entrelazados (estilo
// "infinito") con una línea de pulso cruzando el corazón principal.
// Recreado como SVG a partir del manual de imagen — no hay un ícono
// aislado con fondo transparente disponible, solo el banner completo
// (logoBizDoctor.png). Cada mitad de cada corazón usa uno de los 4
// colores de marca (Azul/Rojo en el corazón principal, Amarillo/Verde
// en el lazo secundario), igual que el wordmark en BizdoctorLogo.tsx.

import { useId } from 'react'

export const HEART_D =
  'M12 21.35 L10.55 20.03 C5.4 15.36 2 12.28 2 8.5 C2 5.42 4.42 3 7.5 3 C9.24 3 10.91 3.81 12 5.09 C13.09 3.81 14.76 3 16.5 3 C19.58 3 22 5.42 22 8.5 C22 12.28 18.6 15.36 13.45 20.03 L12 21.35 Z'

interface Props {
  size?: number
  className?: string
}

export default function BizdoctorIcon({ size = 32, className }: Props) {
  // Ids únicos por instancia — este ícono se repite varias veces en la
  // misma página (sidebar, login, tarjetas), y los clipPath con id fijo
  // colisionaban entre instancias (SVG exige ids únicos por documento).
  const uid = useId()
  const id = (name: string) => `bd-${uid}-${name}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      role="img"
      aria-label="BizDoctor.site"
      className={className}
    >
      <defs>
        <clipPath id={id('h1-left')}><rect x="0" y="0" width="102" height="200" /></clipPath>
        <clipPath id={id('h1-right')}><rect x="102" y="0" width="98" height="200" /></clipPath>
        <clipPath id={id('h2-left')}><rect x="0" y="0" width="126" height="200" /></clipPath>
        <clipPath id={id('h2-right')}><rect x="126" y="0" width="74" height="200" /></clipPath>
        <clipPath id={id('pulse')}>
          <path d={HEART_D} transform="translate(30,10) scale(6)" />
        </clipPath>
      </defs>

      {/* Lazo secundario (atrás), amarillo/verde */}
      <g transform="translate(88,78) scale(3.3)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d={HEART_D} stroke="#FBBC05" clipPath={`url(#${id('h2-left')})`} />
        <path d={HEART_D} stroke="#34A853" clipPath={`url(#${id('h2-right')})`} />
      </g>

      {/* Corazón principal (adelante), azul/rojo */}
      <g transform="translate(30,10) scale(6)" strokeWidth="0.95" strokeLinecap="round" strokeLinejoin="round">
        <path d={HEART_D} stroke="#4285F4" clipPath={`url(#${id('h1-left')})`} />
        <path d={HEART_D} stroke="#EA4335" clipPath={`url(#${id('h1-right')})`} />
      </g>

      {/* Línea de pulso, recortada al interior del corazón principal */}
      <g clipPath={`url(#${id('pulse')})`}>
        <polyline
          points="48,88 78,88 88,60 100,116 110,88 152,88"
          fill="none"
          stroke="#4285F4"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}
