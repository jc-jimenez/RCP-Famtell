import { Resend } from 'resend'

// Lazy: NO instanciar en tiempo de carga del módulo. `next build` (Turbopack)
// evalúa los módulos de las rutas API al "collect page data" y, sin
// RESEND_API_KEY presente (CI, o cualquier build sin secretos), el constructor
// lanzaba "Missing API key" y rompía el build. Con este proxy, el cliente real
// se construye en el primer acceso a una propiedad — es decir, en tiempo de
// request, cuando las variables de entorno sí están inyectadas.
let _resend: Resend | null = null
export const resend = new Proxy({} as Resend, {
  get(_t, prop) {
    if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
    return Reflect.get(_resend, prop, _resend)
  },
})

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@bizdoctor.site'
