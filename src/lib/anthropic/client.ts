import Anthropic from '@anthropic-ai/sdk'

// Lazy (ver src/lib/resend/client.ts): el SDK de Anthropic lanza si no
// encuentra ANTHROPIC_API_KEY, lo que rompía `next build` al recolectar datos
// de las rutas sin secretos. El proxy difiere la construcción al primer uso.
let _anthropic: Anthropic | null = null
export const anthropic = new Proxy({} as Anthropic, {
  get(_t, prop) {
    if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    return Reflect.get(_anthropic, prop, _anthropic)
  },
})

export const NOVA_MODEL = 'claude-sonnet-4-6'
