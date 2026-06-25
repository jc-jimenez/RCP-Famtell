# RCP.ai

Plataforma SaaS de diagnóstico empresarial con IA.

## Stack

- Next.js 15
- TypeScript
- Tailwind CSS
- Supabase
- Prisma
- Stripe
- Anthropic Claude API
- Resend
- Twilio

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores:

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CLAUDE_API_KEY`
- `RESEND_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`

## Estructura del proyecto

- `src/app` — rutas App Router
- `src/components` — componentes de UI reutilizables
- `src/lib` — clientes de integración y utilidades
- `src/types` — tipos compartidos
- `prisma/schema.prisma` — esquema de datos

## GitHub Actions

Se incluye un workflow básico en `.github/workflows/ci.yml` para:

- instalar dependencias
- ejecutar lint
- ejecutar type check
- construir la app
