export default async function EmailVerificadoPage({
  searchParams,
}: {
  searchParams: Promise<{ activada?: string }>
}) {
  const { activada } = await searchParams
  const isActivated = activada === '1'

  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="text-5xl mb-6">{isActivated ? '🎉' : '✉️'}</div>
        <h1 className="text-2xl font-bold text-ink mb-3">
          {isActivated ? '¡Cuenta activada!' : 'Correo verificado'}
        </h1>
        {isActivated ? (
          <>
            <p className="text-muted mb-2 leading-relaxed">
              Tu correo y tu WhatsApp fueron verificados. Tu cuenta está activa con
            </p>
            <p className="text-2xl font-bold text-accent mb-6">100 créditos</p>
          </>
        ) : (
          <p className="text-muted mb-6 leading-relaxed">
            Tu correo electrónico ha sido verificado. Si aún no ingresaste el código de WhatsApp,
            regresa a la pantalla de registro e ingrésalo para activar tu cuenta.
          </p>
        )}
        <a href="/login" className="btn-primary inline-block px-8">
          Iniciar sesión →
        </a>
      </div>
    </main>
  )
}
