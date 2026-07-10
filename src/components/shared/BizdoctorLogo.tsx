// Colores estilo Google aplicados letra por letra a "bizdoctor" — ".site"
// hereda el color del elemento contenedor (mismo patrón que el wordmark
// original de dos tonos, solo que ahora el color va en "bizdoctor").
const LETTER_COLORS: Record<string, string> = {
  b: '#4285F4',
  i: '#EA4335',
  z: '#FBBC05',
  d: '#4285F4',
  o1: '#34A853',
  c: '#EA4335',
  t: '#FBBC05',
  o2: '#4285F4',
  r: '#34A853',
}

const LETTERS: { char: string; key: keyof typeof LETTER_COLORS }[] = [
  { char: 'b', key: 'b' },
  { char: 'i', key: 'i' },
  { char: 'z', key: 'z' },
  { char: 'd', key: 'd' },
  { char: 'o', key: 'o1' },
  { char: 'c', key: 'c' },
  { char: 't', key: 't' },
  { char: 'o', key: 'o2' },
  { char: 'r', key: 'r' },
]

interface Props {
  /** Antepone "www." en azul, igual que en los wordmarks grandes de las páginas públicas */
  withWww?: boolean
}

export default function BizdoctorLogo({ withWww = false }: Props) {
  return (
    <>
      {withWww && <span style={{ color: '#4285F4' }}>www.</span>}
      {LETTERS.map(({ char, key }, i) => (
        <span key={i} style={{ color: LETTER_COLORS[key] }}>{char}</span>
      ))}
      .site
    </>
  )
}
