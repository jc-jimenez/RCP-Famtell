// URL base de la app para construir links absolutos (invitaciones, checkout,
// códigos de registro, llamadas internas server-to-server). En desarrollo
// local, NEXT_PUBLIC_APP_URL sigue apuntando a producción (así está en
// .env.local para que el build/deploy no dependa de una variable distinta),
// así que sin este helper cualquier link generado con `npm run dev` termina
// apuntando al sitio en vivo en lugar de localhost.
export function getBaseUrl(): string {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://rcp.gonextsales.com'
}
