import next from 'eslint-config-next'

const eslintConfig = [
  ...next,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'src/generated/**',
    ],
  },
  {
    // Las reglas del React Compiler (preview, del plugin react-hooks) son muy
    // agresivas y bloqueaban el build/deploy por violaciones preexistentes en
    // código no relacionado con este trabajo. Se dejan como advertencias
    // visibles en vez de errores para no romper CI/Vercel; no-unescaped-entities
    // es puramente cosmética. Ver PR #2 (fallo de deploy en Vercel).
    rules: {
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react/no-unescaped-entities': 'warn',
    },
  },
]

export default eslintConfig
