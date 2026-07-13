// Arte decorativo del panel izquierdo del login: rayos de luz vívidos en los
// 4 colores de marca convergiendo hacia un brillo, con el logomark grande
// dibujado en el mismo punto de convergencia (no como capa aparte — así
// nunca compite por espacio con el texto, sin importar cuánto mida la
// columna de la izquierda), perfil de ciudad detrás y chispas. Todo vector,
// sin fotos de stock. El abanico de rayos está sesgado hacia la derecha a
// propósito para dejar limpia la columna de texto de la izquierda.

import { HEART_D } from './BizdoctorIcon'

const RAYS: { angle: number; color: string; width: number; opacity: number }[] = [
  { angle: -34, color: '#4285F4', width: 40, opacity: 0.62 },
  { angle: -20, color: '#EA4335', width: 56, opacity: 0.68 },
  { angle: -6, color: '#FBBC05', width: 44, opacity: 0.64 },
  { angle: 8, color: '#4285F4', width: 58, opacity: 0.7 },
  { angle: 22, color: '#34A853', width: 42, opacity: 0.62 },
  { angle: 36, color: '#FBBC05', width: 54, opacity: 0.68 },
  { angle: 50, color: '#EA4335', width: 38, opacity: 0.6 },
  { angle: 64, color: '#34A853', width: 50, opacity: 0.65 },
  { angle: 78, color: '#4285F4', width: 34, opacity: 0.55 },
]

const SPARKLES = [
  { x: 350, y: 220, r: 2.6, color: '#4285F4' }, { x: 460, y: 170, r: 2.2, color: '#EA4335' },
  { x: 300, y: 320, r: 2, color: '#FBBC05' }, { x: 500, y: 280, r: 3, color: '#34A853' },
  { x: 400, y: 360, r: 2.2, color: '#4285F4' }, { x: 260, y: 260, r: 2.6, color: '#EA4335' },
  { x: 530, y: 380, r: 2, color: '#34A853' }, { x: 380, y: 180, r: 2.2, color: '#FBBC05' },
]

function Sparkle({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  return (
    <path
      transform={`translate(${x} ${y})`}
      d={`M0 -${r * 2.4} L${r * 0.6} -${r * 0.6} L${r * 2.4} 0 L${r * 0.6} ${r * 0.6} L0 ${r * 2.4} L-${r * 0.6} ${r * 0.6} L-${r * 2.4} 0 L-${r * 0.6} -${r * 0.6} Z`}
      fill={color}
      opacity="0.85"
    />
  )
}

export default function BizdoctorHeroArt() {
  const cx = 400
  const cy = 470

  // El logomark se dibuja igual que BizdoctorIcon.tsx (mismas coordenadas
  // locales dentro de una caja 0-200), envuelto en un único transform que
  // lo reposiciona y reescala como bloque rígido — así el corazón principal
  // (que dentro de esa caja vive en translate(30,10) escala 6) termina
  // centrado en el punto de convergencia (cx, cy) sin tener que recalcular
  // a mano cada coordenada interna del icono.
  const k = 0.867 // escala del logomark completo relativa a su diseño original
  const boxX = cx - 30 * k - 6 * k // -6k centra el corazón (ancho local ~12) en cx
  const boxY = cy - 10 * k - 6 * k

  return (
    <svg
      viewBox="0 0 560 640"
      preserveAspectRatio="xMidYMax slice"
      fill="none"
      className="absolute inset-0 w-full h-full"
      aria-hidden
    >
      <defs>
        <radialGradient id="bd-glow" cx="50%" cy="100%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bd-fade-top" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="rgb(var(--color-surface))" stopOpacity="0" />
          <stop offset="100%" stopColor="rgb(var(--color-surface))" stopOpacity="1" />
        </linearGradient>
        {/* Mismos clip-paths que BizdoctorIcon.tsx, en la caja local 0-200 */}
        <clipPath id="bd-hero-h1-left"><rect x="0" y="0" width="102" height="200" /></clipPath>
        <clipPath id="bd-hero-h1-right"><rect x="102" y="0" width="98" height="200" /></clipPath>
        <clipPath id="bd-hero-h2-left"><rect x="0" y="0" width="126" height="200" /></clipPath>
        <clipPath id="bd-hero-h2-right"><rect x="126" y="0" width="74" height="200" /></clipPath>
        <clipPath id="bd-hero-pulse"><path d={HEART_D} transform="translate(30,10) scale(6)" /></clipPath>
      </defs>

      {/* Perfil de ciudad detrás de los rayos, del lado derecho */}
      <g opacity="0.28" fill="#1A73E8">
        <rect x="340" y="330" width="26" height="270" />
        <rect x="372" y="280" width="34" height="320" />
        <rect x="412" y="350" width="24" height="250" />
        <rect x="442" y="300" width="30" height="300" />
        <rect x="478" y="360" width="22" height="240" />
        <rect x="506" y="260" width="28" height="340" />
        <rect x="540" y="380" width="20" height="220" />
      </g>

      {/* Rayos — sesgados a la derecha, lejos de la columna de texto */}
      <g>
        {RAYS.map((ray, i) => {
          const len = 620
          const rad = (ray.angle * Math.PI) / 180
          // Redondeado a 3 decimales: Math.sin/cos puede diferir en el
          // último dígito entre el motor JS del servidor y el del
          // navegador, lo que producía un mismatch de hidratación en
          // estos <line> y rompía los manejadores de clic de toda la
          // página (incluido el botón de Microsoft más abajo).
          const x2 = Math.round((cx + len * Math.sin(rad)) * 1000) / 1000
          const y2 = Math.round((cy - len * Math.cos(rad)) * 1000) / 1000
          return (
            <line
              key={i}
              x1={cx} y1={cy} x2={x2} y2={y2}
              stroke={ray.color}
              strokeWidth={ray.width}
              strokeOpacity={ray.opacity}
              strokeLinecap="round"
            />
          )
        })}
      </g>

      {/* Brillo del punto de convergencia */}
      <circle cx={cx} cy={cy} r="220" fill="url(#bd-glow)" />

      {/* Anillos decorativos, sutiles, arriba del panel */}
      <circle cx="500" cy="100" r="24" fill="none" stroke="#4285F4" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="4 5" />

      {/* Chispas */}
      <g>
        {SPARKLES.map((s, i) => <Sparkle key={i} {...s} />)}
      </g>

      {/* Logomark grande, anclado al punto de convergencia — mismo diseño
          que BizdoctorIcon.tsx, dibujado aquí (no como componente aparte)
          para que su posición nunca dependa del alto del texto de al lado.
          Todo el bloque usa las coordenadas locales originales (caja
          0-200); un solo transform en el <g> exterior lo reposiciona. */}
      <g transform={`translate(${boxX} ${boxY}) scale(${k})`}>
        <g transform="translate(88,78) scale(3.3)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d={HEART_D} stroke="#FBBC05" clipPath="url(#bd-hero-h2-left)" />
          <path d={HEART_D} stroke="#34A853" clipPath="url(#bd-hero-h2-right)" />
        </g>
        <g transform="translate(30,10) scale(6)" strokeWidth="0.95" strokeLinecap="round" strokeLinejoin="round">
          <path d={HEART_D} stroke="#4285F4" clipPath="url(#bd-hero-h1-left)" />
          <path d={HEART_D} stroke="#EA4335" clipPath="url(#bd-hero-h1-right)" />
        </g>
        <g clipPath="url(#bd-hero-pulse)">
          <polyline
            points="48,88 78,88 88,60 100,116 110,88 152,88"
            fill="none"
            stroke="#4285F4"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>

      {/* Disuelve el arte hacia el fondo sólido arriba, donde va el texto */}
      <rect x="0" y="0" width="560" height="260" fill="url(#bd-fade-top)" />
    </svg>
  )
}
