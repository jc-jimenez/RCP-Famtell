import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { stripe } from '@/lib/stripe/client'
import { getBaseUrl } from '@/lib/baseUrl'

export const dynamic = 'force-dynamic'

const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER ?? '',
  pro: process.env.STRIPE_PRICE_PRO ?? '',
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { plan } = await req.json()
  const priceId = PRICE_IDS[plan]
  if (!priceId) return NextResponse.json({ error: 'Plan inválido o no configurado' }, { status: 400 })

  const appUrl = getBaseUrl()

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: session.user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { plan },
    success_url: `${appUrl}/dashboard/creditos?success=1`,
    cancel_url: `${appUrl}/dashboard/creditos?canceled=1`,
  })

  return NextResponse.json({ url: checkoutSession.url })
}
