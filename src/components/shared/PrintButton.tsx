'use client'

export default function PrintButton({ className = 'btn-secondary text-xs px-3 py-2' }: { className?: string }) {
  return (
    <button onClick={() => window.print()} className={`no-print ${className}`}>
      🖨 Imprimir
    </button>
  )
}
