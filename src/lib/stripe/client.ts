import Stripe from 'stripe'

// Lazy (ver src/lib/resend/client.ts): el constructor de Stripe lanza si falta
// STRIPE_SECRET_KEY, lo que rompía `next build` al recolectar datos de las
// rutas sin secretos. El proxy difiere la construcción al primer uso (request).
let _stripe: Stripe | null = null
export const stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    if (!_stripe) {
      _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' })
    }
    return Reflect.get(_stripe, prop, _stripe)
  },
})
