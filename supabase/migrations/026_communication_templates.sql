-- ============================================================
-- 026: Plantillas de comunicación configurables (Módulo 8.8)
-- ============================================================
-- Ver docs/PRD_RCPFAMTELL3PL.md sección 9.3. Antes era un array
-- TEMPLATES hardcoded en ComunicacionClient.tsx, ni siquiera vivía
-- en base de datos. Las plantillas quedan por CUENTA de consultor
-- (no globales entre consultores, no por caso individual) — un
-- consultor arma su propia librería y la reutiliza en todos sus casos.
-- ============================================================

CREATE TABLE IF NOT EXISTS communication_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category    text NOT NULL,
  label       text NOT NULL,
  channel     text NOT NULL CHECK (channel IN ('email','whatsapp')),
  subject     text,
  body        text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(account_id, label)
);

ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;

-- El consultor dueño de la cuenta gestiona su propia librería
CREATE POLICY "communication_templates_owner" ON communication_templates
  FOR ALL TO authenticated
  USING (account_id IN (SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email'))
  WITH CHECK (account_id IN (SELECT id FROM accounts WHERE email = auth.jwt() ->> 'email'));

-- Los directivos/colaboradores de un caso de esa cuenta solo necesitan leer
-- (para usar las plantillas en la pantalla de Comunicación de su caso)
CREATE POLICY "communication_templates_member_read" ON communication_templates
  FOR SELECT TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM cases WHERE id IN (SELECT my_member_case_ids())
    )
  );

-- ============================================================
-- Seed: las 11 plantillas que hoy están hardcoded se copian a cada
-- cuenta de consultor existente, para no perder el punto de partida
-- al pasar a un catálogo editable. Cuentas nuevas después de esta
-- migración empiezan sin plantillas (se crean desde cero) -- fuera
-- de alcance automatizar el seed en el alta de cuenta.
-- ============================================================
INSERT INTO communication_templates (account_id, category, label, channel, subject, body, sort_order)
SELECT a.id, t.category, t.label, t.channel, t.subject, t.body, t.sort_order
FROM accounts a
CROSS JOIN (VALUES
  ('Prospección', 'Primer contacto (email)', 'email', 'Una idea para {{empresa_prospecto}}',
   E'Hola {{nombre}},\n\nSoy {{consultor}} de {{empresa_consultor}}. Trabajamos con empresas de {{sector}} ayudándoles a identificar oportunidades de crecimiento que no siempre son visibles desde adentro.\n\nVi que {{empresa_prospecto}} {{gancho}} y me pareció que podría tener sentido conversar.\n\n¿Tienes 20 minutos esta semana para una llamada breve? No hay presentación ni pitch — solo una conversación para ver si hay algo en lo que pueda aportarte.\n\nQuedo al pendiente,\n{{consultor}}\n{{telefono}}', 1),
  ('Prospección', 'Primer contacto (WhatsApp)', 'whatsapp', NULL,
   E'Hola {{nombre}}, soy {{consultor}} de {{empresa_consultor}}.\n\nTrabajo con empresas de {{sector}} en diagnósticos de crecimiento. Vi lo que hace {{empresa_prospecto}} y me gustaría platicar 20 minutos contigo — sin presentación, solo para ver si hay algo en lo que pueda aportar.\n\n¿Cuándo te queda bien esta semana? 🙏', 2),
  ('Prospección', 'Seguimiento prospecto frío (WhatsApp)', 'whatsapp', NULL,
   E'Hola {{nombre}}, te escribí hace unos días pero entiendo que el timing no fue el mejor.\n\nSolo quería cerrar el loop: si en algún momento quieres explorar cómo otras empresas de {{sector}} han resuelto {{problema}}, con gusto platicamos.\n\nSin compromiso. 👍', 3),
  ('Reactivación', 'Cliente inactivo (email)', 'email', '{{empresa_prospecto}} — ¿cómo va el año?',
   E'Hola {{nombre}},\n\nHan pasado {{meses}} meses desde que trabajamos juntos y quería escribirte para saber cómo va {{empresa_prospecto}}.\n\nEn ese tiempo hemos visto a varias empresas de {{sector}} enfrentar {{reto_actual}}. Me pregunto si algo de eso resuena contigo.\n\nSi en algún momento quieres retomar la conversación, con gusto me siento contigo. Sin agenda fija — solo para ver dónde están y si hay algo en lo que pueda ayudar.\n\nSaludos,\n{{consultor}}', 4),
  ('Reactivación', 'Cliente inactivo (WhatsApp)', 'whatsapp', NULL,
   E'Hola {{nombre}}! Han pasado un rato desde que hablamos.\n\n¿Cómo va {{empresa_prospecto}}? Me gustaría saber cómo resultó {{accion_previa}}.\n\nSi en algún momento quieres platicar, aquí estoy. 👋', 5),
  ('Propuesta', 'Envío de propuesta (email)', 'email', 'Propuesta RCP · {{empresa_prospecto}}',
   E'Hola {{nombre}},\n\nTal como acordamos, te comparto la propuesta para {{empresa_prospecto}}.\n\nEl documento incluye:\n• Diagnóstico inicial de {{modulos}} módulos\n• Metodología y tiempos estimados\n• Inversión y condiciones\n\nEn resumen, la propuesta está diseñada para {{objetivo_principal}} en un horizonte de {{plazo}}.\n\nQuedo disponible para resolver cualquier duda. Si quieres, podemos agendar una llamada esta semana para revisar el documento juntos.\n\nSaludos,\n{{consultor}}\n{{telefono}}', 6),
  ('Propuesta', 'Seguimiento post-propuesta (WhatsApp)', 'whatsapp', NULL,
   E'Hola {{nombre}}, te envié la propuesta por correo. ¿La pudiste revisar?\n\nSi tienes alguna duda o quieres que revisemos algo juntos, dime y lo vemos. 🙌', 7),
  ('Propuesta', 'Cierre de propuesta (WhatsApp)', 'whatsapp', NULL,
   E'Hola {{nombre}}, quería hacer un último seguimiento a la propuesta.\n\nEntiendo que hay muchas cosas en el día a día. Solo dime si:\na) ¿Quieres que la revisemos juntos?\nb) ¿El timing no es el correcto aún?\nc) ¿Decidieron no continuar?\n\nCualquier respuesta me ayuda para saber cómo seguir. ¡Gracias! 🙏', 8),
  ('Diagnóstico activo', 'Recordatorio de módulo pendiente (WhatsApp)', 'whatsapp', NULL,
   E'Hola {{nombre}}, quería recordarte que tienes pendiente el {{modulo}} de tu diagnóstico en RCP.ai.\n\nSon aproximadamente {{tiempo}} minutos de conversación con Nova — puedes hacerlo desde tu celular cuando tengas un rato.\n\nAquí el link: {{link_modulo}} 🔗', 9),
  ('Diagnóstico activo', 'Reporte de avance semanal (email)', 'email', 'Avance diagnóstico {{empresa_prospecto}} — Semana {{semana}}',
   E'Hola {{nombre}},\n\nTe comparto el avance del diagnóstico de {{empresa_prospecto}} al cierre de la semana {{semana}}:\n\n✅ Módulos completados: {{modulos_completados}}/7\n⏳ Pendientes: {{modulos_pendientes}}\n📊 Próximo paso: {{siguiente_accion}}\n\n{{comentario_consultor}}\n\nCualquier duda, escríbeme.\n\n{{consultor}}', 10),
  ('Cierre', 'Entrega de diagnóstico final (email)', 'email', 'Diagnóstico completo · {{empresa_prospecto}}',
   E'Hola {{nombre}},\n\n¡Listo! El diagnóstico de {{empresa_prospecto}} está completo.\n\nEn RCP.ai ya puedes revisar el Brief ejecutivo con los hallazgos principales, el plan de acción a 90 días y el Índice de Intención Estratégica.\n\nEl siguiente paso es la sesión de presentación de resultados. ¿Cuándo te queda bien esta semana o la próxima?\n\nFue un placer trabajar en esto contigo.\n\n{{consultor}}', 11)
) AS t(category, label, channel, subject, body, sort_order)
ON CONFLICT (account_id, label) DO NOTHING;
