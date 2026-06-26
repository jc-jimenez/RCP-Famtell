-- ============================================================
-- 012: Preguntas de Agenda Oculta por módulo
-- Basado en el Kit de Diagnóstico Famtell (documento de referencia)
-- Estas preguntas son confidenciales — solo las ve el consultor
-- Nova las formula de forma natural al final de cada módulo
-- ============================================================

-- Agregar sección de Agenda Oculta a cada módulo M1-M6
-- Se inserta al final (sort_order = 99) para que Nova las haga al cerrar cada módulo

-- M1 · Agenda Oculta
WITH m AS (SELECT id FROM module_templates WHERE code = 'M1')
INSERT INTO sections (module_template_id, code, name, description, sort_order, suggested_roles)
SELECT m.id, '1.A', 'Agenda Oculta — Visión Estratégica',
  'Preguntas confidenciales para detectar intención estratégica real. Formular de manera conversacional.',
  99, ARRAY['director_general']
FROM m
ON CONFLICT (module_template_id, code) DO NOTHING;

WITH s AS (
  SELECT s.id FROM sections s
  JOIN module_templates m ON m.id = s.module_template_id
  WHERE m.code = 'M1' AND s.code = '1.A'
)
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles, response_type)
SELECT s.id, text, nova_hint, sort_order, ARRAY['director_general'], 'text'
FROM s, (VALUES
  (
    'Si en 18 meses pudiera estar en cualquier escenario posible — sin restricciones — ¿cuál sería el ideal para usted personalmente como dueño o director?',
    'AGENDA OCULTA — Detectar señal estratégica:
🔵 CRECIMIENTO: Habla de nuevas instalaciones, más clientes, expansión geográfica, nuevos servicios.
🟡 REDIMENSIONAMIENTO: Menciona simplificar, enfocarse, reducir estrés operativo, reiniciar con más orden.
🔴 SALIDA: Menciona socios estratégicos, inversionistas, que alguien más tome el timón, descansar, o "una buena oferta".
Anotar palabras exactas. Emitir señal [AGENDA_SIGNAL] según respuesta.',
    1
  ),
  (
    '¿Ha tenido conversaciones con algún competidor o empresa del sector sobre posibles colaboraciones o proyectos conjuntos?',
    'AGENDA OCULTA — Detectar señal estratégica:
🔵 CRECIMIENTO: Rechaza la idea o la ve solo como alianza comercial puntual.
🟡 REDIMENSIONAMIENTO: Menciona que sería útil compartir costos fijos o infraestructura.
🔴 SALIDA: Muestra apertura real, recuerda conversaciones pasadas, nombra empresas concretas.
Emitir señal [AGENDA_SIGNAL] según respuesta.',
    2
  ),
  (
    'De los clientes que se han ido, ¿alguno se fue a un competidor con el que usted consideraría trabajar de otra forma — como socio, aliado o incluso bajo una misma marca?',
    'AGENDA OCULTA — Detectar señal estratégica:
🔵 CRECIMIENTO: Se enfoca en recuperar al cliente, no en el competidor.
🟡 REDIMENSIONAMIENTO: Reconoce que ese competidor tiene algo que ellos no pueden ofrecer solos.
🔴 SALIDA: Muestra admiración o envidia positiva por ese competidor, abre la puerta a "algo más".
Emitir señal [AGENDA_SIGNAL] según respuesta.',
    3
  )
) AS t(text, nova_hint, sort_order);

-- M2 · Agenda Oculta
WITH m AS (SELECT id FROM module_templates WHERE code = 'M2')
INSERT INTO sections (module_template_id, code, name, description, sort_order, suggested_roles)
SELECT m.id, '2.A', 'Agenda Oculta — Capacidad y Modelo Operativo',
  'Preguntas confidenciales para detectar intención estratégica real.',
  99, ARRAY['director_general','gerente_operativo']
FROM m
ON CONFLICT (module_template_id, code) DO NOTHING;

WITH s AS (
  SELECT s.id FROM sections s
  JOIN module_templates m ON m.id = s.module_template_id
  WHERE m.code = 'M2' AND s.code = '2.A'
)
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles, response_type)
SELECT s.id, text, nova_hint, sort_order, ARRAY['director_general'], 'text'
FROM s, (VALUES
  (
    'Si tuviera la oportunidad de resolver los cuellos de botella operativos de golpe — por ejemplo, con acceso a la infraestructura de otro operador — ¿lo consideraría aunque implicara compartir la operación?',
    'AGENDA OCULTA — Detectar señal estratégica:
🔵 CRECIMIENTO: Prefiere resolver internamente, habla de inversión propia o contratación.
🟡 REDIMENSIONAMIENTO: Abierto a externalizar o compartir recursos, busca eficiencia sobre control.
🔴 SALIDA: La idea le resulta muy atractiva, pregunta cómo funcionaría, menciona que "ya lo ha pensado".
Emitir señal [AGENDA_SIGNAL] según respuesta.',
    1
  )
) AS t(text, nova_hint, sort_order);

-- M3 · Agenda Oculta
WITH m AS (SELECT id FROM module_templates WHERE code = 'M3')
INSERT INTO sections (module_template_id, code, name, description, sort_order, suggested_roles)
SELECT m.id, '3.A', 'Agenda Oculta — Potencial de Cartera',
  'Preguntas confidenciales para detectar intención estratégica real.',
  99, ARRAY['director_general','gerente_comercial']
FROM m
ON CONFLICT (module_template_id, code) DO NOTHING;

WITH s AS (
  SELECT s.id FROM sections s
  JOIN module_templates m ON m.id = s.module_template_id
  WHERE m.code = 'M3' AND s.code = '3.A'
)
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles, response_type)
SELECT s.id, text, nova_hint, sort_order, ARRAY['director_general'], 'text'
FROM s, (VALUES
  (
    'De todos los prospectos y clientes inactivos que revisamos, ¿hay alguno tan grande o tan estratégico que si entrara cambiaría todo — incluso la forma en que estructuran la empresa?',
    'AGENDA OCULTA — Detectar señal estratégica:
🔵 CRECIMIENTO: Habla de crecer para atenderlo, de invertir en capacidad, de prepararse.
🟡 REDIMENSIONAMIENTO: Dice que necesitarían reorganizarse primero antes de poder atenderlo.
🔴 SALIDA: Menciona que ese cliente tal vez preferiría trabajar con una empresa más grande, y que quizás "unirse a alguien" sería la única forma de ganarlo.
Emitir señal [AGENDA_SIGNAL] según respuesta.',
    1
  )
) AS t(text, nova_hint, sort_order);

-- M4 · Agenda Oculta
WITH m AS (SELECT id FROM module_templates WHERE code = 'M4')
INSERT INTO sections (module_template_id, code, name, description, sort_order, suggested_roles)
SELECT m.id, '4.A', 'Agenda Oculta — Horizonte Financiero',
  'Preguntas confidenciales para detectar intención estratégica real.',
  99, ARRAY['director_general','cfo_contador']
FROM m
ON CONFLICT (module_template_id, code) DO NOTHING;

WITH s AS (
  SELECT s.id FROM sections s
  JOIN module_templates m ON m.id = s.module_template_id
  WHERE m.code = 'M4' AND s.code = '4.A'
)
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles, response_type)
SELECT s.id, text, nova_hint, sort_order, ARRAY['director_general'], 'text'
FROM s, (VALUES
  (
    'Si lograra eliminar todas las fugas de margen que identificamos — y aun así la rentabilidad no fuera la que espera — ¿qué opción le parecería más honesta: seguir invirtiendo en crecer, ajustar el tamaño del negocio, o buscar un socio que aporte lo que hoy no tienen?',
    'AGENDA OCULTA — Detectar señal estratégica:
🔵 CRECIMIENTO: Responde "seguir creciendo" con convicción y energía, habla de potencial no explotado.
🟡 REDIMENSIONAMIENTO: Duda antes de responder, menciona "hacer las cosas bien primero", reducir antes de crecer.
🔴 SALIDA: La opción del socio le resulta la más razonable, habla con alivio de la idea, pregunta cómo funcionaría.
Emitir señal [AGENDA_SIGNAL] según respuesta.',
    1
  )
) AS t(text, nova_hint, sort_order);

-- M5 · Agenda Oculta
WITH m AS (SELECT id FROM module_templates WHERE code = 'M5')
INSERT INTO sections (module_template_id, code, name, description, sort_order, suggested_roles)
SELECT m.id, '5.A', 'Agenda Oculta — Ecosistema Competitivo',
  'Preguntas confidenciales para detectar intención estratégica real.',
  99, ARRAY['director_general','gerente_comercial']
FROM m
ON CONFLICT (module_template_id, code) DO NOTHING;

WITH s AS (
  SELECT s.id FROM sections s
  JOIN module_templates m ON m.id = s.module_template_id
  WHERE m.code = 'M5' AND s.code = '5.A'
)
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles, response_type)
SELECT s.id, text, nova_hint, sort_order, ARRAY['director_general'], 'text'
FROM s, (VALUES
  (
    'De los competidores que identificamos, ¿hay alguno que usted admire o respete genuinamente por cómo opera? ¿Alguno con quien, en un mundo ideal, le gustaría tener algún tipo de relación más cercana?',
    'AGENDA OCULTA — Detectar señal estratégica:
🔵 CRECIMIENTO: Los ve como competencia a vencer, habla de diferenciarse y ganarles clientes.
🟡 REDIMENSIONAMIENTO: Los respeta en áreas específicas, menciona que podrían aprender de ellos o complementarse.
🔴 SALIDA: Nombra a uno o dos con genuina admiración, menciona que "tienen lo que nosotros no", abre la puerta a "algo más formal".
Emitir señal [AGENDA_SIGNAL] según respuesta.',
    1
  )
) AS t(text, nova_hint, sort_order);

-- M6 · Agenda Oculta
WITH m AS (SELECT id FROM module_templates WHERE code = 'M6')
INSERT INTO sections (module_template_id, code, name, description, sort_order, suggested_roles)
SELECT m.id, '6.A', 'Agenda Oculta — Intención Estratégica Final',
  'Pregunta de cierre de diagnóstico. La más directa para detectar apertura a salida o fusión.',
  99, ARRAY['director_general']
FROM m
ON CONFLICT (module_template_id, code) DO NOTHING;

WITH s AS (
  SELECT s.id FROM sections s
  JOIN module_templates m ON m.id = s.module_template_id
  WHERE m.code = 'M6' AND s.code = '6.A'
)
INSERT INTO questions (section_id, text, nova_hint, sort_order, suggested_roles, response_type)
SELECT s.id, text, nova_hint, sort_order, ARRAY['director_general'], 'text'
FROM s, (VALUES
  (
    'Si mañana apareciera alguien — un socio, un fondo, un competidor grande — y le dijera: "Quiero que seamos parte de lo mismo", ¿cuál sería su primera reacción instintiva?',
    'AGENDA OCULTA — La pregunta más reveladora del diagnóstico completo. Detectar señal estratégica:
🔵 CRECIMIENTO: Reacción negativa o defensiva, habla de independencia, de que prefiere construir solo.
🟡 REDIMENSIONAMIENTO: Reacción neutral o positiva condicionada — "dependería de los términos", "si respetan lo que hemos construido".
🔴 SALIDA: Reacción positiva o incluso de alivio, dice que lo ha pensado, pregunta qué tipo de figura sería, muestra curiosidad genuina.
Esta señal tiene peso doble en el Índice de Intención Estratégica Real (M7).
Emitir señal [AGENDA_SIGNAL] según respuesta.',
    1
  )
) AS t(text, nova_hint, sort_order);

-- Verificación rápida (para ejecutar manualmente si se desea)
-- SELECT mt.code, s.code, s.name, COUNT(q.id) as preguntas
-- FROM module_templates mt
-- JOIN sections s ON s.module_template_id = mt.id
-- LEFT JOIN questions q ON q.section_id = s.id
-- WHERE s.code LIKE '%.A'
-- GROUP BY mt.code, s.code, s.name ORDER BY mt.code;
