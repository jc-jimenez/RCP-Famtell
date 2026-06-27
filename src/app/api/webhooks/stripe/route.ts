import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const PLAN_CREDITS: Record<string, number> = {
  free:       100,
  starter:    100,
  pro:        500,
  enterprise: 2000,
}

async function getEmailFromCustomer(customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
    return customer.deleted ? null : (customer.email ?? null)
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin not configured' }, { status: 500 })
  const db = admin as any

  switch (event.type) {

    // ── Primera suscripción o compra completada ──
    case 'checkout.session.completed': {
      const cs = event.data.object as Stripe.Checkout.Session
      const email = cs.customer_email
      const plan = cs.metadata?.plan ?? 'starter'
      const credits = PLAN_CREDITS[plan] ?? 100
      if (email) {
        await db.from('accounts')
          .update({ plan_id: plan, credits_total: credits, credits_used: 0, status: 'active' })
          .eq('email', email)
      }
      break
    }

    // ── Cambio o renovación de suscripción ──
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const email = await getEmailFromCustomer(sub.customer as string)
      if (!email) break

      const plan = sub.metadata?.plan
        ?? sub.items.data[0]?.price.metadata?.plan
        ?? 'starter'

      const updates: Record<string, unknown> = { plan_id: plan }

      if (sub.status === 'active' || sub.status === 'trialing') {
        updates.status = 'active'
        // Resetear créditos solo si el plan realmente cambió
        const { data: account } = await db.from('accounts')
          .select('plan_id').eq('email', email).single()
        if (account && account.plan_id !== plan) {
          updates.credits_total = PLAN_CREDITS[plan] ?? 100
          updates.credits_used = 0
        }
      }
      if (['canceled', 'unpaid', 'past_due'].includes(sub.status)) {
        updates.status = 'suspended'
      }

      await db.from('accounts').update(updates).eq('email', email)
      break
    }

    // ── Suscripción cancelada ──
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const email = await getEmailFromCustomer(sub.customer as string)
      if (email) {
        await db.from('accounts')
          .update({ plan_id: 'free', status: 'suspended', credits_total: 0 })
          .eq('email', email)
      }
      break
    }

    // ── Renovación mensual exitosa → reponer créditos ──
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      // Solo ciclos de renovación, no el primer cobro (ya cubierto en checkout.session.completed)
      if ((invoice as any).billing_reason !== 'subscription_cycle') break

      const email = await getEmailFromCustomer(invoice.customer as string)
      if (!email) break

      const { data: account } = await db.from('accounts')
        .select('plan_id').eq('email', email).single()
      if (account) {
        const credits = PLAN_CREDITS[account.plan_id] ?? 100
        await db.from('accounts')
          .update({ credits_total: credits, credits_used: 0, status: 'active' })
          .eq('email', email)
      }
      break
    }

    // ── Pago fallido → suspender ──
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const email = await getEmailFromCustomer(invoice.customer as string)
      if (email) {
        await db.from('accounts').update({ status: 'suspended' }).eq('email', email)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
