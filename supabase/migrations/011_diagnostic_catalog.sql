-- ============================================================
-- 011: Catálogo de diagnóstico — módulos, secciones y preguntas
-- ============================================================
-- Estructura jerárquica:
--   module_templates → sections → questions
-- Las preguntas son el guion de Nova. Cada pregunta indica
-- qué roles de empresa deberían responderla.
-- ============================================================

-- 1. Plantillas de módulo (base configurable)
CREATE TABLE IF NOT EXISTS module_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text NOT NULL UNIQUE,   -- M1..M7
  name         text NOT NULL,
  description  text,
  sort_order   int  NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- 2. Secciones dentro de cada módulo
CREATE TABLE IF NOT EXISTS sections (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_template_id uuid NOT NULL REFERENCES module_templates(id) ON DELETE CASCADE,
  code               text NOT NULL,    -- "1.1", "1.2", …
  name               text NOT NULL,
  description        text,
  sort_order         int  NOT NULL DEFAULT 0,
  suggested_roles    text[] NOT NULL DEFAULT '{}',
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  UNIQUE(module_template_id, code)
);

-- 3. Preguntas dentro de cada sección
CREATE TABLE IF NOT EXISTS questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id      uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  text            text NOT NULL,         -- la pregunta que Nova hace
  nova_hint       text,                  -- contexto interno para Nova
  sort_order      int  NOT NULL DEFAULT 0,
  suggested_roles text[] NOT NULL DEFAULT '{}',
  response_type   text NOT NULL DEFAULT 'text'
                  CHECK (response_type IN ('text','number','scale','file')),
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 4. Personalización por caso (el consultor puede editar el catálogo para un caso)
CREATE TABLE IF NOT EXISTS case_question_overrides (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  is_active   boolean NOT NULL DEFAULT true,  -- permite ocultar una pregunta
  custom_text text,                           -- texto alternativo para este caso
  assigned_to uuid REFERENCES case_users(id), -- asignación explícita
  created_at  timestamptz DEFAULT now(),
  UNIQUE(case_id, question_id)
);

-- 5. Respuestas por pregunta (complementa el historial de chat)
CREATE TABLE IF NOT EXISTS question_responses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id      uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  question_id  uuid NOT NULL REFERENCES questions(id),
  case_user_id uuid REFERENCES case_users(id),
  response     text NOT NULL,
  answered_at  timestamptz DEFAULT now(),
  UNIQUE(case_id, question_id, case_user_id)
);

-- ============================================================
-- SEED: Catálogo base M1-M7
-- ============================================================

-- Módulos
INSERT INTO module_templates (code, name, description, sort_order) VALUES
('M1','Radiografía Comercial',  'Diagnóstico del área de ventas, clientes y estrategia comercial', 1),
('M2','Radiografía Operativa',  'Diagnóstico de procesos, capacidad instalada y cadena de suministro', 2),
('M3','Base de Contactos',      'Mapeo de clientes, proveedores y aliados estratégicos', 3),
('M4','Radiografía Financiera', 'Análisis de resultados, flujo de caja y estructura financiera', 4),
('M5','Radiografía Competitiva','Análisis del mercado, competencia y posicionamiento', 5),
('M6','Radiografía Interna',    'Cultura organizacional, estructura, clima y capital humano', 6),
('M7','Síntesis y Plan RCP',    'Consolidación del diagnóstico y hoja de ruta estratégica', 7)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- M1 — RADIOGRAFÍA COMERCIAL
-- ============================================================
WITH m AS (SELECT id FROM module_templates WHERE code = 'M1')
INSERT INTO sections (module_template_id, code, name, description, sort_order, suggested_roles)
SELECT m.id, code, name, description, sort_order, suggested_roles FROM m, (VALUES
  ('1.1','Estrategia y modelo de ventas',   'Cómo se vende y qué se vende',                    1, ARRAY['director_general','gerente_comercial']),
  ('1.2','Proceso comercial',               'Embudo, ciclo de venta y herramientas',            2, ARRAY['gerente_comercial']),
  ('1.3','Cartera de clientes',             'Composición, concentración y rentabilidad',        3, ARRAY['gerente_comercial','director_general']),
  ('1.4','Canales y distribución',          'Cómo llegan los productos/servicios al cliente',   4, ARRAY['gerente_comercial','gerente_operativo']),
  ('1.5','Metas y métricas comerciales',    'KPIs de ventas y seguimiento de resultados',       5, ARRAY['director_general','gerente_comercial'])
) AS t(code, name, description, sort_order, suggested_roles);

-- Preguntas M1 · Sección 1.1
WITH s AS (SELECT id FROM sections WHERE code = '1.1' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M1'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Cuál es el producto o servicio principal que ofrece la empresa?', 'Identificar la propuesta de valor central.', 1, ARRAY['director_general','gerente_comercial']),
  ('¿Cómo describiría el perfil del cliente ideal de la empresa?', 'Buyer persona: industria, tamaño, geografía.', 2, ARRAY['director_general','gerente_comercial']),
  ('¿Cuánto tiempo lleva en el mercado con este modelo de negocio?', 'Madurez del modelo y evolución histórica.', 3, ARRAY['director_general']),
  ('¿Ha habido cambios importantes en la oferta de productos/servicios en los últimos 2 años?', 'Innovación y adaptación al mercado.', 4, ARRAY['director_general']),
  ('¿Cuál considera que es el principal diferenciador competitivo de la empresa?', 'Propuesta de valor y ventaja sostenible.', 5, ARRAY['director_general','gerente_comercial'])
) AS t(text, nova_hint, sort_order, suggested_roles);

-- Preguntas M1 · Sección 1.2
WITH s AS (SELECT id FROM sections WHERE code = '1.2' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M1'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Cómo es el proceso de prospección de nuevos clientes?', 'Generación de leads: inbound, outbound, referidos.', 1, ARRAY['gerente_comercial']),
  ('¿Cuánto tiempo tarda en promedio cerrar una venta desde el primer contacto?', 'Ciclo de venta en días o semanas.', 2, ARRAY['gerente_comercial']),
  ('¿Utilizan algún CRM o sistema para dar seguimiento a los prospectos?', 'Herramientas tecnológicas del área comercial.', 3, ARRAY['gerente_comercial']),
  ('¿Cuántas personas conforman el equipo de ventas y cuál es su estructura?', 'Tamaño y organización del equipo comercial.', 4, ARRAY['gerente_comercial','director_general']),
  ('¿Cómo se establecen las cuotas o metas de ventas por vendedor?', 'Método de asignación y seguimiento de metas.', 5, ARRAY['gerente_comercial'])
) AS t(text, nova_hint, sort_order, suggested_roles);

-- Preguntas M1 · Sección 1.3
WITH s AS (SELECT id FROM sections WHERE code = '1.3' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M1'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Cuántos clientes activos tiene la empresa aproximadamente?', 'Tamaño de la cartera activa.', 1, ARRAY['gerente_comercial','director_general']),
  ('¿El 20% de los clientes genera más del 80% de los ingresos?', 'Concentración de ingresos (regla Pareto).', 2, ARRAY['gerente_comercial','director_general']),
  ('¿Cuál es la tasa de retención o renovación de clientes?', 'Churn rate y fidelización.', 3, ARRAY['gerente_comercial']),
  ('¿Tienen clasificados a los clientes por nivel de rentabilidad o potencial?', 'Segmentación estratégica de cartera.', 4, ARRAY['gerente_comercial']),
  ('¿Cuál es el ticket promedio por cliente y ha cambiado en el último año?', 'Evolución del valor promedio de compra.', 5, ARRAY['gerente_comercial','cfo_contador'])
) AS t(text, nova_hint, sort_order, suggested_roles);

-- Preguntas M1 · Sección 1.4
WITH s AS (SELECT id FROM sections WHERE code = '1.4' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M1'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿A través de qué canales venden: directo, distribuidores, e-commerce, otro?', 'Mix de canales de distribución.', 1, ARRAY['gerente_comercial','director_general']),
  ('¿Qué porcentaje de las ventas proviene de cada canal?', 'Peso relativo de cada canal en el ingreso total.', 2, ARRAY['gerente_comercial']),
  ('¿Hay algún canal que esté creciendo o decreciendo significativamente?', 'Tendencia y evolución de canales.', 3, ARRAY['gerente_comercial','director_general']),
  ('¿Tienen presencia digital activa (e-commerce, redes, marketplace)?', 'Madurez digital del área comercial.', 4, ARRAY['gerente_comercial','gerente_marketing'])
) AS t(text, nova_hint, sort_order, suggested_roles);

-- Preguntas M1 · Sección 1.5
WITH s AS (SELECT id FROM sections WHERE code = '1.5' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M1'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Cuál fue el ingreso total por ventas en el último año?', 'Revenue anual. Solicitar cifra o rango.', 1, ARRAY['director_general','cfo_contador']),
  ('¿Cuál es la meta de ventas para este año y van en qué porcentaje de cumplimiento?', 'Progreso vs. presupuesto de ventas.', 2, ARRAY['director_general','gerente_comercial']),
  ('¿Miden el costo de adquisición de cliente (CAC)?', 'Eficiencia del esfuerzo comercial.', 3, ARRAY['gerente_comercial','cfo_contador']),
  ('¿Cuál es el valor de vida del cliente (LTV) aproximado?', 'Retorno esperado por cliente a largo plazo.', 4, ARRAY['gerente_comercial','director_general'])
) AS t(text, nova_hint, sort_order, suggested_roles);

-- ============================================================
-- M2 — RADIOGRAFÍA OPERATIVA
-- ============================================================
WITH m AS (SELECT id FROM module_templates WHERE code = 'M2')
INSERT INTO sections (module_template_id, code, name, description, sort_order, suggested_roles)
SELECT m.id, code, name, description, sort_order, suggested_roles FROM m, (VALUES
  ('2.1','Procesos de producción o servicio', 'Cómo se genera y entrega el producto/servicio',   1, ARRAY['gerente_operativo']),
  ('2.2','Capacidad instalada y utilización', 'Qué puede producir vs. qué produce realmente',    2, ARRAY['gerente_operativo']),
  ('2.3','Cadena de suministro',              'Compras, proveedores e inventarios',               3, ARRAY['gerente_operativo']),
  ('2.4','Tecnología y sistemas operativos',  'Herramientas, ERP, automatización',                4, ARRAY['gerente_operativo','director_general']),
  ('2.5','Calidad y mejora continua',         'Estándares, indicadores y procesos de mejora',    5, ARRAY['gerente_operativo'])
) AS t(code, name, description, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '2.1' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M2'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Cuáles son los pasos principales para producir o entregar su producto/servicio?', 'Mapeo del flujo de valor principal.', 1, ARRAY['gerente_operativo']),
  ('¿Cuánto tiempo tarda el ciclo completo desde la orden hasta la entrega?', 'Lead time operativo.', 2, ARRAY['gerente_operativo']),
  ('¿Los procesos están documentados o dependen del conocimiento de personas clave?', 'Riesgo operativo por concentración de conocimiento.', 3, ARRAY['gerente_operativo']),
  ('¿Cuáles son los principales cuellos de botella en la operación?', 'Restricciones críticas del proceso.', 4, ARRAY['gerente_operativo']),
  ('¿Cómo manejan los picos de demanda o temporadas altas?', 'Flexibilidad y escalabilidad operativa.', 5, ARRAY['gerente_operativo','director_general'])
) AS t(text, nova_hint, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '2.2' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M2'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Cuál es la capacidad máxima de producción o atención por mes/semana?', 'Capacidad instalada total.', 1, ARRAY['gerente_operativo']),
  ('¿Qué porcentaje de esa capacidad están utilizando actualmente?', 'Tasa de utilización de capacidad.', 2, ARRAY['gerente_operativo']),
  ('¿Tienen equipos o infraestructura ociosa que no se está aprovechando?', 'Activos subutilizados.', 3, ARRAY['gerente_operativo']),
  ('¿Cuántos metros cuadrados de almacén o espacio operativo tienen disponibles?', 'Capacidad física de almacenaje.', 4, ARRAY['gerente_operativo']),
  ('¿Han tenido que rechazar pedidos por falta de capacidad en el último año?', 'Demanda no atendida por restricciones.', 5, ARRAY['gerente_operativo','director_general'])
) AS t(text, nova_hint, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '2.3' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M2'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Con cuántos proveedores clave trabajan y están concentrados en pocos?', 'Riesgo de concentración en cadena de suministro.', 1, ARRAY['gerente_operativo']),
  ('¿Cuál es el tiempo de entrega promedio de sus principales proveedores?', 'Lead time de compras.', 2, ARRAY['gerente_operativo']),
  ('¿Cómo gestionan el inventario? ¿Tienen exceso o desabasto frecuente?', 'Gestión de inventarios y rotación.', 3, ARRAY['gerente_operativo']),
  ('¿Tienen acuerdos de exclusividad o dependencia crítica con algún proveedor?', 'Riesgos contractuales de suministro.', 4, ARRAY['gerente_operativo','director_general']),
  ('¿Cómo manejan la calidad y devoluciones con proveedores?', 'Gestión de calidad en compras.', 5, ARRAY['gerente_operativo'])
) AS t(text, nova_hint, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '2.4' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M2'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Utilizan algún sistema de gestión (ERP, WMS, CRM)? ¿Cuál?', 'Madurez tecnológica operativa.', 1, ARRAY['gerente_operativo','director_general']),
  ('¿Qué procesos están automatizados y cuáles se hacen de forma manual?', 'Grado de automatización.', 2, ARRAY['gerente_operativo']),
  ('¿Tienen problemas frecuentes con los sistemas actuales?', 'Dolores tecnológicos.', 3, ARRAY['gerente_operativo']),
  ('¿La información operativa está integrada o vive en hojas de cálculo separadas?', 'Integración de datos operativos.', 4, ARRAY['gerente_operativo','director_general'])
) AS t(text, nova_hint, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '2.5' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M2'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Tienen procesos formales de control de calidad?', 'Estándares y certificaciones.', 1, ARRAY['gerente_operativo']),
  ('¿Cuál es la tasa de defectos, rechazos o reclamos por calidad?', 'Indicador de calidad operativa.', 2, ARRAY['gerente_operativo']),
  ('¿Han implementado metodologías de mejora continua (Lean, Six Sigma, Kaizen)?', 'Cultura de mejora operativa.', 3, ARRAY['gerente_operativo','director_general'])
) AS t(text, nova_hint, sort_order, suggested_roles);

-- ============================================================
-- M3 — BASE DE CONTACTOS
-- ============================================================
WITH m AS (SELECT id FROM module_templates WHERE code = 'M3')
INSERT INTO sections (module_template_id, code, name, description, sort_order, suggested_roles)
SELECT m.id, code, name, description, sort_order, suggested_roles FROM m, (VALUES
  ('3.1','Base de clientes',       'Calidad y organización de la base de datos de clientes',   1, ARRAY['gerente_comercial']),
  ('3.2','Red de proveedores',     'Mapa de proveedores estratégicos y alternos',               2, ARRAY['gerente_operativo']),
  ('3.3','Alianzas estratégicas',  'Socios, canales y relaciones de negocio clave',             3, ARRAY['director_general'])
) AS t(code, name, description, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '3.1' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M3'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Tienen una base de datos centralizada de clientes? ¿En qué sistema?', 'Estado y herramienta de la base de clientes.', 1, ARRAY['gerente_comercial']),
  ('¿Con qué frecuencia actualizan la información de contacto de los clientes?', 'Higiene y actualización de datos.', 2, ARRAY['gerente_comercial']),
  ('¿Segmentan a los clientes por algún criterio (tamaño, industria, valor)?', 'Segmentación de la base de datos.', 3, ARRAY['gerente_comercial']),
  ('¿Tienen clientes inactivos que podrían reactivarse?', 'Potencial de recuperación de clientes dormidos.', 4, ARRAY['gerente_comercial'])
) AS t(text, nova_hint, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '3.2' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M3'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Tienen mapeados a todos sus proveedores con información de contacto actualizada?', 'Estado del directorio de proveedores.', 1, ARRAY['gerente_operativo']),
  ('¿Tienen proveedores alternativos para los insumos críticos?', 'Plan de contingencia en suministro.', 2, ARRAY['gerente_operativo']),
  ('¿Califican o evalúan periódicamente el desempeño de sus proveedores?', 'Sistema de evaluación de proveedores.', 3, ARRAY['gerente_operativo'])
) AS t(text, nova_hint, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '3.3' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M3'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Tienen acuerdos formales con socios, distribuidores o representantes?', 'Alianzas estratégicas formalizadas.', 1, ARRAY['director_general']),
  ('¿Pertenecen a alguna cámara, asociación o red empresarial?', 'Capital relacional institucional.', 2, ARRAY['director_general']),
  ('¿Hay relaciones clave que dependen de una sola persona en la empresa?', 'Riesgo de concentración relacional.', 3, ARRAY['director_general'])
) AS t(text, nova_hint, sort_order, suggested_roles);

-- ============================================================
-- M4 — RADIOGRAFÍA FINANCIERA
-- ============================================================
WITH m AS (SELECT id FROM module_templates WHERE code = 'M4')
INSERT INTO sections (module_template_id, code, name, description, sort_order, suggested_roles)
SELECT m.id, code, name, description, sort_order, suggested_roles FROM m, (VALUES
  ('4.1','Estado de resultados',      'Ingresos, costos, márgenes y utilidad',             1, ARRAY['cfo_contador','director_general']),
  ('4.2','Flujo de caja',             'Liquidez, ciclo de efectivo y tesorería',            2, ARRAY['cfo_contador','director_general']),
  ('4.3','Balance y estructura',      'Activos, pasivos, patrimonio y deuda',               3, ARRAY['cfo_contador']),
  ('4.4','Indicadores financieros',   'KPIs, ratios clave y benchmarks',                    4, ARRAY['cfo_contador','director_general']),
  ('4.5','Planeación financiera',     'Presupuesto, proyecciones y control',                5, ARRAY['cfo_contador','director_general'])
) AS t(code, name, description, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '4.1' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M4'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Cuál fue el ingreso total de la empresa en el último ejercicio fiscal?', 'Revenue total. Pedir cifra exacta o rango.', 1, ARRAY['cfo_contador','director_general']),
  ('¿Cuál es el margen bruto aproximado (ingresos menos costos directos)?', 'Gross margin en porcentaje.', 2, ARRAY['cfo_contador']),
  ('¿Cuál es el margen operativo o EBITDA?', 'Rentabilidad antes de intereses, impuestos y depreciación.', 3, ARRAY['cfo_contador']),
  ('¿Los gastos fijos representan qué porcentaje del ingreso total?', 'Apalancamiento operativo y riesgo fijo.', 4, ARRAY['cfo_contador']),
  ('¿La empresa ha sido rentable en los últimos 3 años?', 'Tendencia histórica de rentabilidad.', 5, ARRAY['cfo_contador','director_general'])
) AS t(text, nova_hint, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '4.2' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M4'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Tienen suficiente liquidez para operar los próximos 3-6 meses sin nuevos ingresos?', 'Runway de liquidez.', 1, ARRAY['cfo_contador','director_general']),
  ('¿Cuántos días en promedio tardan en cobrar a sus clientes (días cartera)?', 'DSO — Days Sales Outstanding.', 2, ARRAY['cfo_contador']),
  ('¿Cuántos días en promedio tardan en pagar a sus proveedores (días pago)?', 'DPO — Days Payable Outstanding.', 3, ARRAY['cfo_contador']),
  ('¿Han tenido problemas para pagar nómina o proveedores puntualmente en el último año?', 'Señales de tensión de liquidez.', 4, ARRAY['cfo_contador','director_general']),
  ('¿Tienen línea de crédito disponible o acceso a financiamiento de emergencia?', 'Respaldo financiero disponible.', 5, ARRAY['cfo_contador','director_general'])
) AS t(text, nova_hint, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '4.3' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M4'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Cuál es el nivel de deuda total de la empresa (corto y largo plazo)?', 'Pasivo total y estructura de deuda.', 1, ARRAY['cfo_contador']),
  ('¿La razón deuda/patrimonio es menor a 1? ¿O cómo están apalancados?', 'Leverage financiero.', 2, ARRAY['cfo_contador']),
  ('¿Tienen activos fijos que podrían monetizarse o que están subutilizados?', 'Activos con potencial de optimización.', 3, ARRAY['cfo_contador','director_general']),
  ('¿Cuál es la calificación crediticia o historial de crédito de la empresa?', 'Acceso futuro a financiamiento.', 4, ARRAY['cfo_contador'])
) AS t(text, nova_hint, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '4.4' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M4'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Miden el ROI o retorno sobre la inversión de sus principales proyectos?', 'Cultura de medición financiera.', 1, ARRAY['cfo_contador','director_general']),
  ('¿Cuál es el punto de equilibrio mensual de la empresa?', 'Break-even operativo.', 2, ARRAY['cfo_contador']),
  ('¿Comparan sus márgenes con los estándares de su industria?', 'Benchmarking financiero sectorial.', 3, ARRAY['cfo_contador','director_general'])
) AS t(text, nova_hint, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '4.5' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M4'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Tienen un presupuesto anual formal? ¿Lo revisan mensualmente?', 'Proceso de planeación financiera.', 1, ARRAY['cfo_contador','director_general']),
  ('¿Hacen proyecciones de flujo de caja a 3 o 6 meses?', 'Previsión de tesorería.', 2, ARRAY['cfo_contador']),
  ('¿Quién toma las decisiones financieras importantes en la empresa?', 'Gobierno financiero y responsables.', 3, ARRAY['director_general'])
) AS t(text, nova_hint, sort_order, suggested_roles);

-- ============================================================
-- M5 — RADIOGRAFÍA COMPETITIVA
-- ============================================================
WITH m AS (SELECT id FROM module_templates WHERE code = 'M5')
INSERT INTO sections (module_template_id, code, name, description, sort_order, suggested_roles)
SELECT m.id, code, name, description, sort_order, suggested_roles FROM m, (VALUES
  ('5.1','Análisis del mercado',       'Tamaño, tendencias y dinámica del sector',            1, ARRAY['director_general','gerente_comercial','gerente_marketing']),
  ('5.2','Mapa competitivo',           'Competidores directos e indirectos',                  2, ARRAY['director_general','gerente_comercial','gerente_marketing']),
  ('5.3','Posicionamiento de marca',   'Percepción, reputación y diferenciación',             3, ARRAY['director_general','gerente_comercial','gerente_marketing']),
  ('5.4','Estrategia de precios',      'Política de precios y comparativo vs. competencia',   4, ARRAY['director_general','gerente_comercial'])
) AS t(code, name, description, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '5.1' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M5'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿En qué industria o segmento de mercado compite principalmente la empresa?', 'Definición precisa del mercado objetivo.', 1, ARRAY['director_general']),
  ('¿Cuál estiman que es el tamaño de su mercado potencial?', 'TAM/SAM estimado.', 2, ARRAY['director_general','gerente_comercial']),
  ('¿Cuál es la participación de mercado aproximada de la empresa?', 'Market share estimado.', 3, ARRAY['director_general','gerente_comercial']),
  ('¿El mercado está creciendo, estable o en contracción?', 'Tendencia macroeconómica del sector.', 4, ARRAY['director_general']),
  ('¿Hay tendencias tecnológicas o regulatorias que amenacen o beneficien al sector?', 'Factores externos PESTEL relevantes.', 5, ARRAY['director_general'])
) AS t(text, nova_hint, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '5.2' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M5'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Quiénes son sus 3 principales competidores directos?', 'Mapa de competidores directos.', 1, ARRAY['director_general','gerente_comercial']),
  ('¿En qué aspectos son más fuertes sus competidores que ustedes?', 'Análisis de brechas competitivas.', 2, ARRAY['director_general','gerente_comercial']),
  ('¿En qué aspectos son ustedes superiores a sus competidores?', 'Ventajas competitivas actuales.', 3, ARRAY['director_general','gerente_comercial']),
  ('¿Han perdido clientes con competidores específicos recientemente?', 'Win/loss analysis básico.', 4, ARRAY['gerente_comercial']),
  ('¿Hay nuevos entrantes o sustitutos que estén cambiando el mercado?', 'Amenaza de nuevos competidores.', 5, ARRAY['director_general','gerente_comercial'])
) AS t(text, nova_hint, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '5.3' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M5'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Cómo describiría la reputación de la empresa en el mercado?', 'Percepción actual de la marca.', 1, ARRAY['director_general','gerente_comercial']),
  ('¿Tienen reseñas, testimonios o NPS de clientes?', 'Evidencia de satisfacción y reputación.', 2, ARRAY['gerente_comercial','gerente_marketing']),
  ('¿La empresa es conocida principalmente por precio, calidad o servicio?', 'Posicionamiento percibido.', 3, ARRAY['director_general','gerente_comercial']),
  ('¿Tienen presencia activa en redes sociales o medios digitales?', 'Visibilidad digital de la marca.', 4, ARRAY['gerente_marketing'])
) AS t(text, nova_hint, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '5.4' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M5'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Cómo definen sus precios: costos, mercado, valor percibido u otro criterio?', 'Metodología de pricing.', 1, ARRAY['director_general','gerente_comercial']),
  ('¿Sus precios están por arriba, al nivel o por debajo de la competencia?', 'Posicionamiento de precio.', 2, ARRAY['director_general','gerente_comercial']),
  ('¿Tienen flexibilidad para ajustar precios sin perder clientes?', 'Elasticidad de precio percibida.', 3, ARRAY['director_general','gerente_comercial']),
  ('¿Han subido precios en el último año? ¿Cómo reaccionaron los clientes?', 'Historial de ajustes de precio.', 4, ARRAY['director_general','gerente_comercial'])
) AS t(text, nova_hint, sort_order, suggested_roles);

-- ============================================================
-- M6 — RADIOGRAFÍA INTERNA
-- ============================================================
WITH m AS (SELECT id FROM module_templates WHERE code = 'M6')
INSERT INTO sections (module_template_id, code, name, description, sort_order, suggested_roles)
SELECT m.id, code, name, description, sort_order, suggested_roles FROM m, (VALUES
  ('6.1','Estructura organizacional', 'Organigrama, roles y responsabilidades',               1, ARRAY['director_general','rrhh_admin']),
  ('6.2','Capital humano',            'Talento, competencias y desarrollo',                   2, ARRAY['rrhh_admin','director_general']),
  ('6.3','Cultura y clima laboral',   'Valores, ambiente y compromiso del equipo',            3, ARRAY['rrhh_admin','director_general']),
  ('6.4','Liderazgo y gobierno',      'Toma de decisiones, gobierno corporativo',             4, ARRAY['director_general'])
) AS t(code, name, description, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '6.1' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M6'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Cuántas personas trabajan en la empresa actualmente?', 'Headcount total.', 1, ARRAY['rrhh_admin','director_general']),
  ('¿Tienen un organigrama formal y está actualizado?', 'Estructura organizacional documentada.', 2, ARRAY['rrhh_admin','director_general']),
  ('¿Las responsabilidades de cada rol están claramente definidas?', 'Claridad de roles y descripción de puestos.', 3, ARRAY['rrhh_admin']),
  ('¿Hay personas que concentran demasiadas funciones críticas?', 'Riesgo de dependencia en personas clave.', 4, ARRAY['director_general','rrhh_admin']),
  ('¿Cómo es la distribución por área: operaciones, ventas, admin, otros?', 'Proporción de recursos por función.', 5, ARRAY['rrhh_admin','director_general'])
) AS t(text, nova_hint, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '6.2' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M6'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Cuál es la rotación de personal anual (porcentaje de salidas vs. total)?', 'Tasa de rotación y retención.', 1, ARRAY['rrhh_admin']),
  ('¿Tienen procesos formales de reclutamiento, selección e inducción?', 'Madurez del proceso de contratación.', 2, ARRAY['rrhh_admin']),
  ('¿Invierten en capacitación y desarrollo de su equipo?', 'Inversión en capital humano.', 3, ARRAY['rrhh_admin','director_general']),
  ('¿Tienen un programa de evaluación de desempeño?', 'Sistema de gestión del desempeño.', 4, ARRAY['rrhh_admin']),
  ('¿Hay posiciones vacantes críticas que no han podido cubrirse?', 'Brechas de talento actuales.', 5, ARRAY['rrhh_admin','director_general'])
) AS t(text, nova_hint, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '6.3' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M6'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Cómo describiría el ambiente de trabajo en la empresa en este momento?', 'Temperatura del clima laboral.', 1, ARRAY['director_general','rrhh_admin']),
  ('¿Los empleados conocen y comparten los valores y misión de la empresa?', 'Alineación cultural.', 2, ARRAY['rrhh_admin','director_general']),
  ('¿Han medido el nivel de satisfacción o compromiso del equipo recientemente?', 'Encuestas de engagement.', 3, ARRAY['rrhh_admin']),
  ('¿Hay conflictos internos recurrentes entre áreas o personas?', 'Disfunciones organizacionales.', 4, ARRAY['director_general','rrhh_admin']),
  ('¿El equipo está alineado con la dirección estratégica de la empresa?', 'Coherencia entre estrategia y equipo.', 5, ARRAY['director_general'])
) AS t(text, nova_hint, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '6.4' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M6'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Cómo se toman las decisiones importantes en la empresa? ¿Es centralizado o delegado?', 'Estilo de liderazgo y gobierno.', 1, ARRAY['director_general']),
  ('¿Tienen un consejo directivo, consejo de administración o asesores externos?', 'Gobierno corporativo formal.', 2, ARRAY['director_general']),
  ('¿El fundador o director es el único que puede tomar decisiones críticas?', 'Dependencia en liderazgo único.', 3, ARRAY['director_general']),
  ('¿Tienen un plan de sucesión para los puestos clave?', 'Continuidad del negocio y sucesión.', 4, ARRAY['director_general'])
) AS t(text, nova_hint, sort_order, suggested_roles);

-- ============================================================
-- M7 — SÍNTESIS Y PLAN RCP
-- ============================================================
WITH m AS (SELECT id FROM module_templates WHERE code = 'M7')
INSERT INTO sections (module_template_id, code, name, description, sort_order, suggested_roles)
SELECT m.id, code, name, description, sort_order, suggested_roles FROM m, (VALUES
  ('7.1','Validación del diagnóstico', 'Confirmar hallazgos y alinear percepción vs. realidad', 1, ARRAY['director_general']),
  ('7.2','Prioridades estratégicas',   'Los 3-5 focos de acción más importantes',              2, ARRAY['director_general']),
  ('7.3','Plan de acción RCP',         'Hoja de ruta con responsables y fechas',               3, ARRAY['director_general'])
) AS t(code, name, description, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '7.1' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M7'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿Cuál considera que es el mayor reto de la empresa en este momento?', 'Percepción del director sobre el problema principal.', 1, ARRAY['director_general']),
  ('¿Hay algo que los módulos anteriores no hayan capturado y sea importante mencionar?', 'Información adicional relevante no cubierta.', 2, ARRAY['director_general']),
  ('¿Comparte el diagnóstico que ha emergido en esta sesión? ¿Qué agregaría o corregiría?', 'Validación y alineación del diagnóstico.', 3, ARRAY['director_general'])
) AS t(text, nova_hint, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '7.2' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M7'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('Si pudiera resolver solo 3 cosas en los próximos 6 meses, ¿cuáles serían?', 'Priorización desde la perspectiva del director.', 1, ARRAY['director_general']),
  ('¿Qué recursos (dinero, tiempo, talento) tiene disponibles para hacer cambios?', 'Capacidad de ejecución del plan.', 2, ARRAY['director_general']),
  ('¿Hay alguna restricción o condición externa que limite las opciones estratégicas?', 'Restricciones de contexto.', 3, ARRAY['director_general'])
) AS t(text, nova_hint, sort_order, suggested_roles);

WITH s AS (SELECT id FROM sections WHERE code = '7.3' AND module_template_id = (SELECT id FROM module_templates WHERE code = 'M7'))
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles)
SELECT s.id, text, nova_hint, sort_order, suggested_roles FROM s, (VALUES
  ('¿En qué fecha le gustaría ver los primeros resultados concretos del plan?', 'Horizonte temporal del plan RCP.', 1, ARRAY['director_general']),
  ('¿Quién dentro de la empresa será el responsable de dar seguimiento al plan?', 'Sponsor interno del plan de acción.', 2, ARRAY['director_general']),
  ('¿Con qué frecuencia le gustaría que revisemos el avance del plan juntos?', 'Cadencia de seguimiento con el consultor.', 3, ARRAY['director_general'])
) AS t(text, nova_hint, sort_order, suggested_roles);

-- ============================================================
-- RLS: el catálogo es de solo lectura pública (para la app)
-- Las modificaciones solo vienen de admin o SECURITY DEFINER
-- ============================================================
ALTER TABLE module_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_question_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_responses      ENABLE ROW LEVEL SECURITY;

-- Catálogo: lectura libre para usuarios autenticados
CREATE POLICY "catalog_read" ON module_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalog_read" ON sections         FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalog_read" ON questions        FOR SELECT TO authenticated USING (true);

-- Overrides: el consultor del caso puede leer/escribir
CREATE POLICY "overrides_by_account" ON case_question_overrides
  FOR ALL TO authenticated
  USING (
    case_id IN (
      SELECT id FROM cases WHERE account_id IN (
        SELECT id FROM accounts WHERE email = auth.email()
      )
    )
  );

-- Respuestas: el case_user puede insertar/leer las suyas
CREATE POLICY "responses_own" ON question_responses
  FOR ALL TO authenticated
  USING (
    case_user_id IN (
      SELECT id FROM case_users WHERE user_id = auth.uid()
    )
    OR
    case_id IN (
      SELECT id FROM cases WHERE account_id IN (
        SELECT id FROM accounts WHERE email = auth.email()
      )
    )
  );
