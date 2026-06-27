export default function EmailVerificadoPage() {
  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="text-5xl mb-6">✉️</div>
        <h1 className="text-2xl font-bold text-ink mb-3">Correo verificado</h1>
        <p className="text-muted mb-6 leading-relaxed">
          Tu correo electrónico ha sido verificado. Si ya ingresaste el código de WhatsApp,
          tu cuenta está activa. De lo contrario, regresa a la pantalla de registro e ingresa el código.
        </p>
        <a href="/login" className="btn-primary inline-block px-8">
          Iniciar sesión →
        </a>
      </div>
    </main>
  )
}
