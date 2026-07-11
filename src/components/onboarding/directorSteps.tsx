import type { OnboardingStep } from './OnboardingWizard'

export const directorOnboardingSteps: OnboardingStep[] = [
  {
    title: '¿Qué es BizDoctor?',
    body: (
      <>
        <p>BizDoctor es el diagnóstico que tu consultor está haciendo de tu empresa. El resultado final es un Plan concreto a 90 días, 1 año y 3 años — construido con lo que tú y tu equipo respondan en las entrevistas.</p>
      </>
    ),
  },
  {
    title: 'Tu rol como Director General',
    body: (
      <>
        <p>Como Director, tus respuestas tienen el peso más alto: decisiones estratégicas, cifras financieras y visión del negocio que nadie más en tu equipo puede responder.</p>
        <p>Además de contestar tus módulos, verás el avance de todo el diagnóstico y, al final, el Brief completo.</p>
      </>
    ),
  },
  {
    title: 'Cómo prepararte para la entrevista',
    body: (
      <>
        <p>No es un examen — es una conversación guiada por IA. Contesta con calma, en el momento en que tengas la cabeza despejada, sin prisa por terminar rápido.</p>
        <p>Puedes pausar y continuar después; tu avance se guarda solo.</p>
      </>
    ),
  },
  {
    title: 'Archivos y documentos que vas a necesitar',
    body: (
      <>
        <p>Ten a la mano, si los tienes: estados financieros recientes, lista de clientes principales, organigrama y cualquier reporte de operación o ventas.</p>
        <p>No es obligatorio tenerlos todos — pero mientras más datos reales uses, mejor sale el diagnóstico.</p>
      </>
    ),
  },
  {
    title: 'Veracidad de la información',
    body: (
      <>
        <p>El Plan que recibirás se construye exactamente con lo que respondas. Si maquillas un número o suavizas un problema, el Plan va a apuntar a la dirección equivocada.</p>
        <p>Esta herramienta es para ayudarte a ti, no para evaluarte — entre más honesto seas, más útil te va a resultar.</p>
      </>
    ),
  },
  {
    title: 'Calidad de la información',
    body: (
      <>
        <p>Prefiere respuestas específicas ("perdemos 2 clientes al mes por retrasos en entrega") sobre respuestas vagas ("a veces hay problemas de servicio").</p>
        <p>Si no sabes un dato exacto, da tu mejor estimación y dilo — es mejor que dejarlo en blanco.</p>
      </>
    ),
  },
  {
    title: 'Amplitud de la información',
    body: (
      <>
        <p>Cada módulo cubre varios temas — no te enfoques solo en lo que te resulta cómodo hablar. Los temas que se dejan de lado suelen ser justo los que más necesitan atención.</p>
      </>
    ),
  },
  {
    title: 'Si no termino la entrevista',
    body: (
      <>
        <p>Un módulo sin terminar queda marcado en rojo o ámbar, y el Brief final (tu Plan 90d/1a/3a) no se genera hasta que todos los módulos estén completos.</p>
        <p>Puedes pausar y volver cuando quieras — lo importante es terminar antes de que tu consultor necesite publicar el diagnóstico.</p>
      </>
    ),
  },
]
