// Arte decorativo del panel izquierdo del login: rayos de luz en los 4
// colores de marca convergiendo hacia un punto de brillo, con el logomark
// grande flotando encima y un perfil de ciudad sutil al fondo. Todo vector
// (SVG + gradientes) — no hay fotos de stock disponibles, esto reemplaza el
// mural de montaña/ciudad de los mockups usando solo la paleta real.

const RAYS: { angle: number; color: string; width: number; opacity: number }[] = [
  { angle: -78, color: '#4285F4', width: 46, opacity: 0.5 },
  { angle: -62, color: '#4285F4', width: 30, opacity: 0.35 },
  { angle: -46, color: '#EA4335', width: 40, opacity: 0.45 },
  { angle: -30, color: '#EA4335', width: 26, opacity: 0.3 },
  { angle: -12, color: '#FBBC05', width: 50, opacity: 0.5 },
  { angle: 6, color: '#4285F4', width: 34, opacity: 0.4 },
  { angle: 22, color: '#34A853', width: 44, opacity: 0.48 },
  { angle: 38, color: '#34A853', width: 28, opacity: 0.32 },
  { angle: 54, color: '#FBBC05', width: 38, opacity: 0.4 },
  { angle: 70, color: '#EA4335', width: 30, opacity: 0.32 },
]

const SPARKLES = [
  { x: 210, y: 320, r: 3, color: '#4285F4' }, { x: 340, y: 260, r: 2.4, color: '#EA4335' },
  { x: 120, y: 400, r: 2, color: '#FBBC05' }, { x: 400, y: 380, r: 3.4, color: '#34A853' },
  { x: 260, y: 460, r: 2.2, color: '#4285F4' }, { x: 90, y: 480, r: 2.8, color: '#EA4335' },
  { x: 430, y: 460, r: 2, color: '#34A853' }, { x: 180, y: 300, r: 2.4, color: '#FBBC05' },
]

export default function BizdoctorHeroArt() {
  const cx = 260
  const cy = 560

  return (
    <svg
      viewBox="0 0 520 640"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 w-full h-full"
      aria-hidden
    >
      <defs>
        <radialGradient id="bd-glow" cx="50%" cy="100%" r="75%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bd-fade-top" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="rgb(var(--color-surface))" stopOpacity="0" />
          <stop offset="100%" stopColor="rgb(var(--color-surface))" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Rayos */}
      <g>
        {RAYS.map((ray, i) => {
          const len = 640
          const rad = (ray.angle * Math.PI) / 180
          const x2 = cx + len * Math.sin(rad)
          const y2 = cy - len * Math.cos(rad)
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
      <circle cx={cx} cy={cy} r="260" fill="url(#bd-glow)" />

      {/* Perfil de ciudad, muy sutil, apenas insinuado detrás de los rayos */}
      <g opacity="0.16" fill="#1A73E8">
        <rect x="10" y="470" width="34" height="170" />
        <rect x="52" y="430" width="26" height="210" />
        <rect x="86" y="480" width="30" height="160" />
        <rect x="430" y="450" width="28" height="190" />
        <rect x="466" y="410" width="24" height="230" />
        <rect x="398" y="490" width="24" height="150" />
      </g>

      {/* Chispas */}
      <g>
        {SPARKLES.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.color} opacity="0.7" />
        ))}
      </g>

      {/* Disuelve el arte hacia el fondo sólido en la parte superior, donde
          va el texto, para que siga siendo legible sin scrim adicional */}
      <rect x="0" y="0" width="520" height="260" fill="url(#bd-fade-top)" />
    </svg>
  )
}
