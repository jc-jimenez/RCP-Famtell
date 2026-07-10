import type { OnboardingStep } from './OnboardingWizard'

export const colaboradorOnboardingSteps: OnboardingStep[] = [
  {
    title: '¿Qué es BizDoctor?',
    body: (
      <>
        <p>BizDoctor es el diagnóstico que se está haciendo de tu empresa. El resultado final es un Plan concreto a 90 días, 1 año y 3 años, construido con las respuestas de tu equipo.</p>
      </>
    ),
  },
  {
    title: 'Tu participación',
    body: (
      <>
        <p>A ti te tocan uno o varios módulos según tu puesto — no todo el diagnóstico, solo las preguntas relacionadas con tu área.</p>
        <p>Contestas en una conversación guiada por IA, a tu ritmo, y tu avance se guarda solo.</p>
      </>
    ),
  },
  {
    title: 'Cómo prepararte',
    body: (
      <>
        <p>No es un examen. Responde con información real de tu día a día — cifras, ejemplos concretos, y lo que realmente pasa en tu área, no lo que "debería" pasar.</p>
      </>
    ),
  },
  {
    title: 'Veracidad, calidad y amplitud',
    body: (
      <>
        <p>Tus respuestas alimentan directamente el Plan de la empresa — si suavizas un problema o dejas algo vago, el Plan puede apuntar mal.</p>
        <p>Prefiere ejemplos específicos sobre respuestas generales, y no dejes temas sin cubrir por incomodidad.</p>
      </>
    ),
  },
  {
    title: 'Si no termino mi entrevista',
    body: (
      <>
        <p>Tu módulo queda marcado como pendiente y bloquea que se genere el Brief final de la empresa hasta que lo completes.</p>
        <p>Puedes pausar y volver cuando quieras desde "Mis módulos".</p>
      </>
    ),
  },
]
