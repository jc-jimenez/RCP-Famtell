import type { OnboardingStep } from './OnboardingWizard'

export const consultorOnboardingSteps: OnboardingStep[] = [
  {
    title: '¿Qué es BizDoctor?',
    body: (
      <>
        <p>BizDoctor es la herramienta con la que conduces el diagnóstico de tus clientes: entrevistas guiadas por IA, hallazgos automáticos y, al final, un Plan concreto a 90 días, 1 año y 3 años.</p>
        <p>Todo lo que configures aquí (puestos, participantes, módulos) alimenta directamente ese Plan — vale la pena hacerlo en orden.</p>
      </>
    ),
  },
  {
    title: 'Empresa o Departamento',
    body: (
      <>
        <p>Al crear un caso eliges qué vas a diagnosticar: <strong>una Empresa completa</strong> o <strong>un Departamento específico</strong> de una empresa (ej. solo el almacén, solo el área comercial).</p>
        <p>Entre más contexto real captures al crear el caso (giro, productos/servicios y, si es un departamento, su hipótesis y objetivos), mejor va a enfocar la IA las preguntas de la entrevista.</p>
      </>
    ),
  },
  {
    title: 'Cómo se estructura tu caso',
    body: (
      <>
        <p>Cada caso pasa por 3 pasos de preparación antes de que arranque el diagnóstico:</p>
        <p><strong>1. Puestos</strong> → <strong>2. Participantes</strong> → <strong>3. Módulos</strong>.</p>
        <p>Después de eso, el equipo del cliente contesta los módulos de entrevista y tú publicas el Brief con el Plan 90d/1a/3a.</p>
      </>
    ),
  },
  {
    title: 'Alta de Puestos',
    body: (
      <>
        <p>Da de alta los puestos reales de la empresa del cliente (no un catálogo genérico) con su descriptivo de funciones.</p>
        <p>Sin puestos creados, no puedes invitar participantes ni asignarles preguntas.</p>
      </>
    ),
  },
  {
    title: 'Alta de Participantes',
    body: (
      <>
        <p>Cada participante (director o colaborador) se asigna a uno de los puestos que ya creaste.</p>
        <p>Un puesto sin participante activo bloquea el módulo correspondiente más adelante.</p>
      </>
    ),
  },
  {
    title: 'Alta de Módulos',
    body: (
      <>
        <p>En Módulos activas/desactivas preguntas del catálogo y las mapeas a cada puesto — eso decide qué le pregunta la IA a cada persona.</p>
        <p>Si tu caso es Empresa o Departamento, primero vas a generar el catálogo de módulos con IA (a la medida del contexto que capturaste) — después lo editas y lo mapeas igual que cualquier otro caso.</p>
        <p>Un puesto sin preguntas mapeadas queda marcado como pendiente hasta que lo configures.</p>
      </>
    ),
  },
  {
    title: 'Si un módulo queda incompleto',
    body: (
      <>
        <p>Cada módulo muestra un semáforo: <span className="text-rose-600 font-medium">rojo</span> (nadie ha contestado), <span className="text-amber-600 font-medium">ámbar</span> (falta alguien) o <span className="text-emerald-600 font-medium">verde</span> (completo).</p>
        <p>El Brief final no se genera hasta que todos los módulos estén en verde — es una protección para que el Plan 90d/1a/3a no se construya con información a medias.</p>
      </>
    ),
  },
]
