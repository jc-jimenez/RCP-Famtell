import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const PLAN_CREDITS: Record<string, number> = {
  starter: 100,
  pro: 500,
  enterprise: 2000,
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
    case 'checkout.session.completed': {
      const checkoutSession = event.data.object as Stripe.Checkout.Session
      const email = checkoutSession.customer_email
      const plan = checkoutSession.metadata?.plan ?? 'starter'
      const credits = PLAN_CREDITS[plan] ?? 100

      if (email) {
        await db
          .from('accounts')
          .update({ subscription_plan: plan, credits_balance: credits, status: 'active' })
          .eq('email', email)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer
      const email = customer.email
      const priceId = sub.items.data[0]?.price.id
      const plan = sub.metadata?.plan ?? 'starter'

      if (email && priceId) {
        const updates: Record<string, unknown> = { subscription_plan: plan }
        if (sub.status === 'active') updates.status = 'active'
        if (sub.status === 'canceled' || sub.status === 'unpaid') updates.status = 'suspended'
        await db.from('accounts').update(updates).eq('email', email)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer
      if (customer.email) {
        await db
          .from('accounts')
          .update({ subscription_plan: 'starter', status: 'suspended' })
          .eq('email', customer.email)
      }
      break
    }

    case 'invoice.payment_succeeded': {
      // Credit top-up on renewal
      const invoice = event.data.object as Stripe.Invoice
      const customer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer
      if (customer.email) {
        const { data: account } = await db
          .from('accounts')
          .select('subscription_plan')
          .eq('email', customer.email)
          .single()
        if (account) {
          const credits = PLAN_CREDITS[account.subscription_plan] ?? 100
          await db
            .from('accounts')
            .update({ credits_balance: credits })
            .eq('email', customer.email)
        }
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
