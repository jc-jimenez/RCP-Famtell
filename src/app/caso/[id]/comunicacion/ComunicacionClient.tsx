'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import AppShell from '@/components/shared/AppShell'
import type { UserRole } from '@/types'

interface Props {
  caseId: string
  companyName: string
  industry: string
  role: string
  email: string
}

// ── Plantillas ──────────────────────────────────────────────────────────────

interface Template {
  id: string
  category: string
  label: string
  channel: 'email' | 'whatsapp'
  subject?: string
  body: string
}

const TEMPLATES: Template[] = [
  // ── PROSPECCIÓN ──
  {
    id: 'prosp_email_1',
    category: 'Prospección',
    label: 'Primer contacto (email)',
    channel: 'email',
    subject: 'Una idea para {{empresa_prospecto}}',
    body: `Hola {{nombre}},

Soy {{consultor}} de {{empresa_consultor}}. Trabajamos con empresas de {{sector}} ayudándoles a identificar oportunidades de crecimiento que no siempre son visibles desde adentro.

Vi que {{empresa_prospecto}} {{gancho}} y me pareció que podría tener sentido conversar.

¿Tienes 20 minutos esta semana para una llamada breve? No hay presentación ni pitch — solo una conversación para ver si hay algo en lo que pueda aportarte.

Quedo al pendiente,
{{consultor}}
{{telefono}}`,
  },
  {
    id: 'prosp_wa_1',
    category: 'Prospección',
    label: 'Primer contacto (WhatsApp)',
    channel: 'whatsapp',
    body: `Hola {{nombre}}, soy {{consultor}} de {{empresa_consultor}}.

Trabajo con empresas de {{sector}} en diagnósticos de crecimiento. Vi lo que hace {{empresa_prospecto}} y me gustaría platicar 20 minutos contigo — sin presentación, solo para ver si hay algo en lo que pueda aportar.

¿Cuándo te queda bien esta semana? 🙏`,
  },
  {
    id: 'prosp_wa_2',
    category: 'Prospección',
    label: 'Seguimiento prospecto frío (WhatsApp)',
    channel: 'whatsapp',
    body: `Hola {{nombre}}, te escribí hace unos días pero entiendo que el timing no fue el mejor.

Solo quería cerrar el loop: si en algún momento quieres explorar cómo otras empresas de {{sector}} han resuelto {{problema}}, con gusto platicamos.

Sin compromiso. 👍`,
  },

  // ── REACTIVACIÓN ──
  {
    id: 'react_email_1',
    category: 'Reactivación',
    label: 'Cliente inactivo (email)',
    channel: 'email',
    subject: '{{empresa_prospecto}} — ¿cómo va el año?',
    body: `Hola {{nombre}},

Han pasado {{meses}} meses desde que trabajamos juntos y quería escribirte para saber cómo va {{empresa_prospecto}}.

En ese tiempo hemos visto a varias empresas de {{sector}} enfrentar {{reto_actual}}. Me pregunto si algo de eso resuena contigo.

Si en algún momento quieres retomar la conversación, con gusto me siento contigo. Sin agenda fija — solo para ver dónde están y si hay algo en lo que pueda ayudar.

Saludos,
{{consultor}}`,
  },
  {
    id: 'react_wa_1',
    category: 'Reactivación',
    label: 'Cliente inactivo (WhatsApp)',
    channel: 'whatsapp',
    body: `Hola {{nombre}}! Han pasado un rato desde que hablamos.

¿Cómo va {{empresa_prospecto}}? Me gustaría saber cómo resultó {{accion_previa}}.

Si en algún momento quieres platicar, aquí estoy. 👋`,
  },

  // ── PROPUESTA ──
  {
    id: 'prop_email_1',
    category: 'Propuesta',
    label: 'Envío de propuesta (email)',
    channel: 'email',
    subject: 'Propuesta RCP · {{empresa_prospecto}}',
    body: `Hola {{nombre}},

Tal como acordamos, te comparto la propuesta para {{empresa_prospecto}}.

El documento incluye:
• Diagnóstico inicial de {{modulos}} módulos
• Metodología y tiempos estimados
• Inversión y condiciones

En resumen, la propuesta está diseñada para {{objetivo_principal}} en un horizonte de {{plazo}}.

Quedo disponible para resolver cualquier duda. Si quieres, podemos agendar una llamada esta semana para revisar el documento juntos.

Saludos,
{{consultor}}
{{telefono}}`,
  },
  {
    id: 'prop_wa_1',
    category: 'Propuesta',
    label: 'Seguimiento post-propuesta (WhatsApp)',
    channel: 'whatsapp',
    body: `Hola {{nombre}}, te envié la propuesta por correo. ¿La pudiste revisar?

Si tienes alguna duda o quieres que revisemos algo juntos, dime y lo vemos. 🙌`,
  },
  {
    id: 'prop_wa_2',
    category: 'Propuesta',
    label: 'Cierre de propuesta (WhatsApp)',
    channel: 'whatsapp',
    body: `Hola {{nombre}}, quería hacer un último seguimiento a la propuesta.

Entiendo que hay muchas cosas en el día a día. Solo dime si:
a) ¿Quieres que la revisemos juntos?
b) ¿El timing no es el correcto aún?
c) ¿Decidieron no continuar?

Cualquier respuesta me ayuda para saber cómo seguir. ¡Gracias! 🙏`,
  },

  // ── DIAGNÓSTICO EN CURSO ──
  {
    id: 'diag_wa_1',
    category: 'Diagnóstico activo',
    label: 'Recordatorio de módulo pendiente (WhatsApp)',
    channel: 'whatsapp',
    body: `Hola {{nombre}}, quería recordarte que tienes pendiente el {{modulo}} de tu diagnóstico en RCP.ai.

Son aproximadamente {{tiempo}} minutos de conversación con Nova — puedes hacerlo desde tu celular cuando tengas un rato.

Aquí el link: {{link_modulo}} 🔗`,
  },
  {
    id: 'diag_email_1',
    category: 'Diagnóstico activo',
    label: 'Reporte de avance semanal (email)',
    channel: 'email',
    subject: 'Avance diagnóstico {{empresa_prospecto}} — Semana {{semana}}',
    body: `Hola {{nombre}},

Te comparto el avance del diagnóstico de {{empresa_prospecto}} al cierre de la semana {{semana}}:

✅ Módulos completados: {{modulos_completados}}/7
⏳ Pendientes: {{modulos_pendientes}}
📊 Próximo paso: {{siguiente_accion}}

{{comentario_consultor}}

Cualquier duda, escríbeme.

{{consultor}}`,
  },

  // ── CIERRE ──
  {
    id: 'cierre_email_1',
    category: 'Cierre',
    label: 'Entrega de diagnóstico final (email)',
    channel: 'email',
    subject: 'Diagnóstico completo · {{empresa_prospecto}}',
    body: `Hola {{nombre}},

¡Listo! El diagnóstico de {{empresa_prospecto}} está completo.

En RCP.ai ya puedes revisar el Brief ejecutivo con los hallazgos principales, el plan de acción a 90 días y el Índice de Intención Estratégica.

El siguiente paso es la sesión de presentación de resultados. ¿Cuándo te queda bien esta semana o la próxima?

Fue un placer trabajar en esto contigo.

{{consultor}}`,
  },
]

const CATEGORIES = ['Todos', ...Array.from(new Set(TEMPLATES.map(t => t.category)))]

// ── Componente ───────────────────────────────────────────────────────────────

export default function ComunicacionClient({ caseId, companyName, industry, role, email }: Props) {
  const shellRole: UserRole = role === 'consultant' ? 'consultant' : 'director'

  const [category, setCategory] = useState('Todos')
  const [channel, setChannel]   = useState<'all' | 'email' | 'whatsapp'>('all')
  const [selectedId, setSelected] = useState(TEMPLATES[0].id)
  const [copied, setCopied]     = useState(false)

  // Variables del usuario
  const [vars, setVars] = useState({
    nombre:             '',
    empresa_prospecto:  companyName,
    empresa_consultor:  '',
    consultor:          '',
    telefono:           '',
    sector:             industry,
    gancho:             '',
    problema:           '',
    meses:              '6',
    reto_actual:        '',
    accion_previa:      '',
    modulos:            '7',
    objetivo_principal: '',
    plazo:              '3 meses',
    modulo:             'Módulo 2',
    tiempo:             '30',
    link_modulo:        '',
    semana:             '1',
    modulos_completados:'3',
    modulos_pendientes: 'M4, M5, M6, M7',
    siguiente_accion:   'Completar M4 esta semana',
    comentario_consultor: '',
  })

  function setVar(key: string, val: string) {
    setVars(prev => ({ ...prev, [key]: val }))
  }

  const filtered = useMemo(() => TEMPLATES.filter(t => {
    if (category !== 'Todos' && t.category !== category) return false
    if (channel !== 'all' && t.channel !== channel) return false
    return true
  }), [category, channel])

  const selected = TEMPLATES.find(t => t.id === selectedId) ?? filtered[0]

  function fillVars(text: string) {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key as keyof typeof vars] || `[${key}]`)
  }

  const filledBody    = selected ? fillVars(selected.body) : ''
  const filledSubject = selected?.subject ? fillVars(selected.subject) : ''

  async function copyText() {
    const text = selected?.channel === 'email' && filledSubject
      ? `Asunto: ${filledSubject}\n\n${filledBody}`
      : filledBody
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Detectar variables usadas en la plantilla seleccionada
  const usedVars = useMemo(() => {
    if (!selected) return []
    const matches = new Set<string>()
    const pattern = /\{\{(\w+)\}\}/g
    let m
    const fullText = (selected.subject ?? '') + selected.body
    while ((m = pattern.exec(fullText)) !== null) matches.add(m[1])
    return Array.from(matches)
  }, [selected])

  const VAR_LABELS: Record<string, string> = {
    nombre: 'Nombre del contacto', empresa_prospecto: 'Empresa del prospecto',
    empresa_consultor: 'Tu empresa', consultor: 'Tu nombre', telefono: 'Tu teléfono',
    sector: 'Sector / industria', gancho: 'Gancho de entrada', problema: 'Problema clave',
    meses: 'Meses desde último contacto', reto_actual: 'Reto actual del sector',
    accion_previa: 'Acción previa tomada', modulos: 'Nº de módulos',
    objetivo_principal: 'Objetivo principal', plazo: 'Plazo estimado',
    modulo: 'Módulo pendiente', tiempo: 'Minutos estimados', link_modulo: 'Link del módulo',
    semana: 'Número de semana', modulos_completados: 'Módulos completados',
    modulos_pendientes: 'Módulos pendientes', siguiente_accion: 'Siguiente acción',
    comentario_consultor: 'Comentario del consultor',
  }

  return (
    <AppShell role={shellRole} email={email} caseCompanyName={companyName}>
      <div className="max-w-5xl mx-auto space-y-4">

        {role !== 'director' && (
          <Link href={`/dashboard/caso/${caseId}` as any} className="text-xs text-muted hover:text-ink inline-block">
            ← {companyName}
          </Link>
        )}

        <div>
          <h1 className="text-xl font-bold text-ink">Motor de Comunicación</h1>
          <p className="text-sm text-muted mt-1">Plantillas de email y WhatsApp para cada etapa del proceso comercial</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">

          {/* ── Lista de plantillas ── */}
          <div className="space-y-3">
            {/* Filtros */}
            <div className="flex gap-1.5 flex-wrap">
              {(['all', 'email', 'whatsapp'] as const).map(ch => (
                <button key={ch} onClick={() => setChannel(ch)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    channel === ch ? 'border-accent bg-accent text-white' : 'border-subtle text-muted hover:bg-surface-2'
                  }`}>
                  {ch === 'all' ? 'Todos' : ch === 'email' ? '✉ Email' : '💬 WhatsApp'}
                </button>
              ))}
            </div>

            <div className="space-y-0.5">
              {CATEGORIES.filter(c => c !== 'Todos').map(cat => {
                const catTemplates = filtered.filter(t => t.category === cat)
                if (catTemplates.length === 0) return null
                return (
                  <div key={cat}>
                    <p className="text-xs text-faint font-medium px-2 pt-3 pb-1 uppercase tracking-wide">{cat}</p>
                    {catTemplates.map(t => (
                      <button key={t.id} onClick={() => setSelected(t.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl transition-colors flex items-center gap-2 ${
                          selectedId === t.id ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-surface-2'
                        }`}>
                        <span className="text-xs">{t.channel === 'email' ? '✉' : '💬'}</span>
                        <span className="text-xs">{t.label}</span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Editor + Preview ── */}
          {selected && (
            <div className="space-y-4">
              {/* Variables */}
              <div className="card p-4 space-y-3">
                <h2 className="text-xs font-semibold text-ink uppercase tracking-wide">Variables</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {usedVars.map(v => (
                    <div key={v}>
                      <label className="text-xs text-muted block mb-1">{VAR_LABELS[v] ?? v}</label>
                      <input
                        type="text"
                        value={vars[v as keyof typeof vars] ?? ''}
                        onChange={e => setVar(v, e.target.value)}
                        placeholder={`[${v}]`}
                        className="input-field w-full text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{selected.channel === 'email' ? '✉' : '💬'}</span>
                    <h2 className="text-sm font-semibold text-ink">{selected.label}</h2>
                    <span className={`badge text-xs ${selected.channel === 'email' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {selected.channel === 'email' ? 'Email' : 'WhatsApp'}
                    </span>
                  </div>
                  <button
                    onClick={copyText}
                    className="btn-primary text-xs px-4 py-1.5"
                  >
                    {copied ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>

                {selected.subject && (
                  <div className="bg-surface-2 rounded-xl px-4 py-2.5">
                    <span className="text-xs text-muted">Asunto: </span>
                    <span className="text-sm text-ink">{filledSubject}</span>
                  </div>
                )}

                <div className={`rounded-xl p-4 whitespace-pre-wrap text-sm leading-relaxed ${
                  selected.channel === 'whatsapp'
                    ? 'bg-emerald-50 border border-emerald-100 text-emerald-900'
                    : 'bg-surface border border-subtle text-ink'
                }`}>
                  {filledBody}
                </div>

                {/* Indicador de variables sin llenar */}
                {filledBody.includes('[') && (
                  <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                    ⚠ Hay variables sin completar — aparecen como [nombre_variable]
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
