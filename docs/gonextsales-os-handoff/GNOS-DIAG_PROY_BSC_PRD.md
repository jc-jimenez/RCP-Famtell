# GNOS-DIAG / GNOS-PROY / GNOS-BSC — mini-PRD de handoff a GoNextSales-OS

**Origen de este documento:** producto de una limpieza de alcance de BizDoctor/RCP.ai (2026-07-15). El dueño del producto decidió que estos tres módulos **no son parte de BizDoctor** — pertenecen a una plataforma distinta, GoNextSales-OS. Este documento vive temporalmente en el repo de BizDoctor (`rcpai`) solo porque es donde se hizo el análisis; muévelo al repo/proyecto real de GoNextSales-OS.

**Qué se queda en BizDoctor, para que no haya ambigüedad de límites:** el camino Puestos → Entrevistas Nova → Brief (Plan 90 días / 1 año / 3 años) es el producto real de BizDoctor y no se toca. Todo lo descrito aquí sale de ahí.

**Revisión 2 (2026-07-15, mismo día):** el dueño del producto pidió explícitamente anclar cada módulo a marcos de mejores prácticas de industria en vez de descripciones genéricas — SPIN Selling y Teoría de Restricciones para GNOS-DIAG, PMBOK/PMI para GNOS-PROY, Balanced Scorecard de Kaplan & Norton para GNOS-BSC (con espacio para recomendar otra cosa si aplicaba — no aplicó, ver sección GNOS-BSC). Esta revisión reemplaza la v1 del documento, no la complementa.

**Revisión 3 (2026-07-15, mismo día):** se agrega un cuarto módulo, **GNOS-CRM**, a partir de CRM y Comunicación de BizDoctor — mismo criterio que los otros 3: ninguno alimenta el Brief/entregable final, son herramientas de venta/relación del consultor. A diferencia de Escenarios/Tarifas/Propuestas (cero integración real con BizDoctor), CRM sí tiene una integración viva (auto-import de contactos desde M3) — ver tradeoff al final de esa sección antes de decidir cuándo desconectarlo.

**Auditoría de Tablas/KPIs/Check-in (2026-07-15):** a petición del dueño del producto, se validó si Tablas realmente alimenta el Brief — no lo hacía (gap real, corregido el mismo día en `api/brief/generate/route.ts`, ver commit correspondiente) — y se auditó persistencia/completitud de KPIs y Check-in (ambos completos: CRUD real, RLS correcta, upsert semántico, sin gaps). Detalle en [[scope-cut-round2-gnos-modules]].

---

## GNOS-DIAG — Diagnóstico Comercial como Motor de Ventas Consultivas

### El funnel completo (contexto dado por el dueño del producto, cita conservada)
> Famtell diseña una campaña, o crea un webinar o una masterclass acerca de las mejores prácticas de industria de la logística y de los almacenes de depósito, lanza la campaña y los interesados dan click en el CTA, después caen en CRM, los invitas a la master y después los invitas a que agenden un diagnóstico de su operación gratis, **aquí es donde GNOS-DIAG cobra vida**, porque vas a analizar su operación y principalmente a identificar dónde Famtell puede vender sus productos/servicios, y el CRM va dando seguimiento a propuestas, escenarios, etc.

**Dónde empieza y termina GNOS-DIAG dentro de ese funnel:** campaña → webinar/masterclass → captura de lead → nutrición son etapas de marketing/CRM upstream, no el corazón de este módulo (aunque el CRM sigue siendo el sistema de registro del pipeline completo). **GNOS-DIAG arranca en el momento en que el lead agenda su diagnóstico gratuito** y corre hasta que produce una propuesta con escenarios — de ahí en adelante, el seguimiento hasta el cierre vuelve a ser CRM.

### Marco 1 — SPIN Selling (Neil Rackham) para la conversación de diagnóstico

Rackham no diseñó SPIN como técnica de cierre, sino como metodología de **descubrimiento de necesidades** en ventas complejas B2B de ticket alto — exactamente el caso de un engagement de consultoría/servicios logísticos, no una venta transaccional. El guion de la sesión de diagnóstico gratuito debe estructurarse en sus 4 tipos de pregunta, en este orden, no como una encuesta plana:

1. **Situación** — preguntas de hechos sobre el estado actual de la operación del prospecto (m² de almacén, # de SKUs, volumen mensual, # de clientes, procesos actuales). Construyen el mapa de la operación pero Rackham advierte explícitamente que en exceso aburren y desgastan al prospecto — deben ser las mínimas necesarias para alimentar el análisis de restricciones (marco 2), no un cuestionario exhaustivo.
2. **Problema** — preguntas que exploran dificultades, cuellos de botella o insatisfacciones percibidas ("¿dónde sientes que pierdes más tiempo o dinero en tu operación?").
3. **Implicación** — preguntas que amplían la CONSECUENCIA del problema (costo, riesgo, efecto en otras áreas) sin que el consultor la enuncie — el prospecto la articula él mismo ("si ese cuello de botella sigue así 6 meses más, ¿qué te cuesta?"). Esta es la fase que más vende y la más fácil de hacer mal — requiere que el problema esté bien identificado primero (de ahí la dependencia directa con el marco 2).
4. **Necesidad-beneficio** — preguntas que llevan al prospecto a articular el VALOR de resolverlo ("si eliminaras ese cuello de botella, ¿qué cambiaría para tu negocio?"). Es autopersuasión: el prospecto vende la solución a sí mismo: el consultor no presenta, pregunta.

**Reutilizable de BizDoctor:** el patrón de entrevista conversacional guiada por IA (Nova) es la interfaz correcta para esto — lo que cambia por completo es el guion (orientado a las 4 fases SPIN + detección de restricciones, no a las preguntas de diagnóstico organizacional de M1-M7).

### Marco 2 — Teoría de Restricciones / *The Goal* (Eliyahu Goldratt) para el análisis de la operación

Si el producto/servicio que se vende es almacenamiento y distribución (o cualquier operación de flujo — manufactura, logística, servicio), *The Goal* da el marco correcto para que GNOS-DIAG no genere una lista genérica de "áreas de oportunidad" sino **el cuello de botella real** del prospecto. Los 5 pasos de enfoque de Goldratt:

1. **Identificar** la restricción — el recurso o proceso que limita el throughput total del sistema (en un almacén: capacidad de andenes, velocidad de picking, disponibilidad de montacargas, tiempo de despacho aduanal, etc.).
2. **Explotar** la restricción — sacarle el máximo rendimiento posible antes de invertir en más capacidad.
3. **Subordinar** todo lo demás a la restricción — el resto del proceso debe ritmarse a ella; optimizar una estación que NO es el cuello de botella es desperdicio de esfuerzo.
4. **Elevar** la restricción — invertir/expandir capacidad ahí, y solo ahí.
5. **Volver al paso 1** sin caer en inercia — resuelta una restricción, el cuello de botella se mueve a otro punto del sistema.

Las 3 métricas de Goldratt que GNOS-DIAG debería poder estimar cuando haya datos suficientes: **Throughput** (tasa a la que el sistema genera dinero vía ventas), **Inventario** (dinero atrapado en el sistema) y **Gasto operativo** (dinero para convertir inventario en throughput).

**Por qué importa combinarlo con SPIN:** el cuello de botella identificado con TOC es lo que le da sustancia real a las preguntas de Implicación — en vez de una pregunta de implicación genérica, el consultor la hace sobre el cuello de botella específico ya detectado ("tu velocidad de picking es X, tu volumen es Y — a ese ritmo, ¿cuánto negocio estás rechazando en temporada alta?"). Y el cuello de botella detectado ES, casi siempre, el ángulo de venta: exactamente el problema que el catálogo de productos/servicios de la empresa vendedora puede resolver.

### Flujo de usuario propuesto (con los 2 marcos aplicados)
1. Lead agenda diagnóstico gratuito (viene de CRM, ya nutrido vía masterclass).
2. Sesión de diagnóstico guiada (chat IA o formulario estructurado) recorre las 4 fases SPIN; las preguntas de Situación están diseñadas para mapear el proceso operativo del prospecto paso a paso — es el insumo crudo para TOC, no un fin en sí mismo.
3. Motor de análisis aplica los 5 pasos de TOC sobre las respuestas de Situación/Problema para identificar el/los cuello(s) de botella del prospecto.
4. Salida: mapa de restricciones + JTBD (qué necesita contratar el prospecto para resolver su restricción, formato "Cuando… necesito… para…", mismo patrón ya usado en el Brief de BizDoctor) + oportunidades de venta del catálogo de la empresa vendedora, priorizadas por el cuello de botella detectado.
5. Generador de propuesta (con tarifario real) + escenarios what-if anclados en la restricción ("si resuelves tu cuello de botella de X, tu capacidad/throughput sube Y%") — el motor de proyección financiera de BizDoctor (`src/app/caso/[id]/escenarios/EscenariosClient.tsx`) es reutilizable casi directo: lo que cambia es qué alimenta los "levers", que deben salir de la restricción detectada, no de sliders arbitrarios.
6. CRM registra la etapa del pipeline (diagnóstico completado → propuesta enviada → escenario revisado → cierre) y da seguimiento.

### Modelo de datos sugerido
- `lead_pipeline_stage`: awareness → lead capturado → nutrido/asistió a masterclass → diagnóstico agendado → diagnóstico completado → propuesta enviada → escenario revisado → cliente.
- `diagnostic_session`: respuestas estructuradas por fase SPIN (situación / problema / implicación / necesidad-beneficio).
- `constraint_analysis`: cuello de botella identificado, evidencia, recurso/proceso limitante, throughput/inventario/gasto operativo estimado si hay datos numéricos suficientes.
- `jtbd_findings`: mismo patrón que `brief_documents.jtbd_comercial` en BizDoctor (statement, situation, job, outcome, evidence, approved).
- `rate_card`: tarifario propio de la empresa vendedora, reutilizable entre propuestas (lógica de cálculo de referencia: `src/app/caso/[id]/tarifas/TarifasClient.tsx`).
- `proposal`: snapshot de cotización + texto generado + versión (patrón de referencia: `src/app/caso/[id]/propuestas/ProposalClient.tsx`, pero atando el precio al `rate_card` y no a un campo de texto libre como hace hoy).
- `what_if_scenario`: levers anclados en `constraint_analysis` + proyección calculada.

### Dato reutilizable disponible: `denue_empresas`
BizDoctor tiene una tabla `denue_empresas` (migración `018_denue_empresas.sql`) poblada vía ETL desde CSVs del portal de microdatos de INEGI (directorio nacional de unidades económicas — nombre, razón social, giro/SCIAN, tamaño, ubicación, teléfono, correo). Se construyó para un Radar de Prospectos de BizDoctor ya borrado (ver [[scope-cut-round2-gnos-modules]]), así que hoy no la usa nada, pero es exactamente el universo de empresas por giro/zona que la etapa de generación de leads/campaña de GNOS-DIAG podría usar para prospección fría, más allá de los leads inbound del funnel de webinar. Recomendación: exportar/migrar esta tabla al backend de GoNextSales-OS en vez de perder el ETL ya hecho.

---

## GNOS-PROY — Gestión de Proyecto según PMBOK (PMI)

El Project Management Institute organiza la dirección de proyectos en 5 grupos de procesos (Inicio, Planificación, Ejecución, Monitoreo y Control, Cierre) y 10 áreas de conocimiento. El dueño del producto pidió específicamente 3: Alcance (EDT), Cronograma (secuenciación/tiempos) y Recursos (asignación/responsables) — son las que se detallan abajo.

### EDT / WBS (Estructura de Desglose del Trabajo)
- Descomposición jerárquica del alcance del proyecto en entregables, hasta el nivel donde cada paquete de trabajo es estimable y asignable. Heurística común del PMI: regla 8/80 (cada paquete de trabajo, entre 8 y 80 horas de esfuerzo — ni tan grande que no se pueda estimar bien, ni tan chico que sea micromanagement).
- Diferencia clásica que GNOS-PROY debe respetar: **el WBS se organiza por entregables, no por actividades** — las tareas/actividades salen de descomponer cada paquete de trabajo ya en el cronograma, no al revés.
- Cada nodo del WBS necesita: descripción, criterios de aceptación, responsable (Accountable).

### Secuenciación de tareas
- Relaciones de dependencia entre tareas (Precedence Diagramming Method): Fin-a-Inicio (la más común), Inicio-a-Inicio, Fin-a-Fin, Inicio-a-Fin.
- **Ruta crítica (Critical Path Method):** la secuencia de tareas que determina la duración mínima del proyecto — cualquier retraso ahí retrasa el proyecto completo, mientras que las tareas fuera de la ruta crítica tienen holgura. GNOS-PROY debe calcular y resaltar la ruta crítica automáticamente conforme se cargan tareas y dependencias — no dejarlo como cálculo manual del consultor, que es donde este tipo de herramientas suele fallar en la práctica.

### Tiempos
- Estimación por tarea: técnicas comunes son analógica (comparar con proyectos similares), paramétrica (fórmula basada en variables conocidas) o **PERT** (optimista + 4×más-probable + pesimista, entre 6 — útil cuando hay incertidumbre real en tareas de implementación, que es el caso típico de un engagement de consultoría/logística).
- Vista Gantt como estándar de facto para visualizar el cronograma resultante.

### Recursos y responsables
- Matriz **RACI** (Responsable/Aprueba/Consultado/Informado) por paquete de trabajo — mínimo viable: cada tarea con exactamente un Accountable y cero o más Responsible.
- Nivelación de carga: si una persona queda sobreasignada en semanas simultáneas, el sistema debe señalarlo activamente, no solo permitirlo silenciosamente.

### Cómo se conecta con lo que ya existe en BizDoctor
El check-in semanal de BizDoctor (`src/app/caso/[id]/checkin/CheckinClient.tsx` + `api/checkins`) es una bitácora de estado libre — captura contactos hechos, obstáculos y un score subjetivo de 1-10, sin ningún WBS debajo. **GNOS-PROY corrige eso de raíz:** primero se define el EDT y cronograma del engagement (arriba), y el check-in periódico pasa a reportar avance CONTRA tareas específicas del WBS (% completado por tarea), no un score global desconectado.

**Bug real de BizDoctor a no repetir:** el costeo/deducción de créditos del check-in se ató alguna vez al email de quien envía el reporte, no al dueño real del engagement — rompía para cualquier rol que no fuera el dueño de la cuenta facturable. Cualquier costeo en GNOS-PROY debe atarse al proyecto/cuenta, nunca al usuario que hace clic.

### Modelo de datos sugerido
- `project` (= engagement vendido; nace de una `proposal` de GNOS-DIAG al cerrarse).
- `wbs_node` (jerárquico vía `parent_id`; marca si es entregable o paquete de trabajo; `owner_id`; criterios de aceptación).
- `task` (bajo un `wbs_node`; duración estimada; fechas; `predecessor_id` + tipo de relación PDM).
- `resource_assignment` (task_id, user_id, rol RACI).
- `status_report` (periódico, ligado a `task_id` específicas — evolución directa del check-in actual de BizDoctor, mismo concepto, atado a tareas reales en vez de flotar sin contexto).

---

## GNOS-BSC — Balanced Scorecard (Kaplan & Norton)

### Recomendación: sí, Balanced Scorecard — no encontré razón para cambiarlo

- BSC ya es, sin que el producto lo llamara así, el marco que BizDoctor usa intuitivamente: el radar de 4 áreas del login (Finanzas / Comercial / Operaciones / Capital Humano-Estrategia) ES la estructura de las 4 perspectivas clásicas de Kaplan & Norton (Financiera, Cliente, Procesos Internos, Aprendizaje y Crecimiento), con nombres ligeramente distintos. No es una decisión nueva — es formalizar lo que el producto ya intuye.
- BSC está diseñado exactamente para el gap que ya se había señalado: "hoy las métricas son una lista plana sin agrupar". El aporte real de Kaplan & Norton no es "más KPIs" — es el **mapa estratégico**: una cadena causa-efecto explícita entre perspectivas (Aprendizaje y Crecimiento habilita mejores Procesos Internos, que producen mejor propuesta de valor al Cliente, que se traduce en resultados Financieros). Sin ese mapa, un tablero agrupado por área sigue siendo solo una lista bonita, no un Balanced Scorecard real.
- Encaja de forma natural con el north star ya validado del producto (Plan 90 días / 1 año / 3 años, ver [[prd-v2-lean-scope]]): el Strategy Map de BSC cascada objetivos desde la visión de largo plazo hacia iniciativas de corto plazo — es la misma lógica que `plan_3a → plan_1a → plan_6m → plan_90d` ya usa en BizDoctor, aplicada a 4 perspectivas en vez de a un solo eje temporal.
- Alternativa que sí se consideró y se descartó: **OKR** (Objectives & Key Results). Es más ligero y popular en startups/tech, pero está pensado para ciclos trimestrales de una sola función/equipo con alta autonomía y bajo acoplamiento entre equipos — por diseño, ignora la interdependencia entre áreas. Para un diagnóstico multi-área de una PyME tradicional (3PL, manufactura, etc.) donde Finanzas depende de Comercial que depende de Operaciones, BSC captura esa interdependencia y OKR la ignora a propósito. Para consultoría de transformación (no producto/tech de ritmo trimestral autónomo), BSC es el estándar correcto.

### Estructura por perspectiva (OMTI: Objetivos, Métricas, Metas, Iniciativas)
Para cada una de las 4 perspectivas fijas:
- **Objetivo** estratégico declarativo (ej. "Diversificar la base de clientes").
- **Métrica(s)** que lo miden (ej. "% de ingresos concentrado en el top-3 de clientes").
- **Meta** a un horizonte (ej. "<35% en 12 meses").
- **Iniciativa(s)** que mueven la métrica (ej. "activar 2 segmentos nuevos") — esto es literalmente lo que ya produce GNOS-DIAG, cerrando el círculo entre los 3 módulos (ver síntesis abajo).

### El cambio de fondo: mapa estratégico, no solo dashboard agrupado
- Relación causa-efecto explícita entre objetivos de perspectivas distintas — un objetivo de Aprendizaje y Crecimiento debe poder declarar qué objetivo(s) de Procesos Internos habilita, y así sucesivamente hasta Financiera.
- Artefacto visual esperado: diagrama de 4 carriles (uno por perspectiva) con flechas de causalidad entre objetivos — es el artefacto estándar de un BSC real, distinto de un dashboard de KPIs sueltos como el `kpi_records` actual de BizDoctor.

### Modelo de datos sugerido (evoluciona `case_kpi_definitions` / `kpi_records` de BizDoctor)
- `bsc_perspective` (las 4 fijas — mismo criterio anti-sobre-construcción ya usado en otras decisiones de BizDoctor: fijas, no un catálogo editable, salvo necesidad real comprobada).
- `strategic_objective` (`perspective_id`, nombre, descripción, `related_objective_ids[]` para el mapa causa-efecto).
- `kpi_definition` (ligado a `objective_id`, no solo a un caso suelto como hoy — cada métrica cuelga de un objetivo, no flota sin contexto).
- `kpi_record` (mismo patrón de captura periódica que ya funciona en BizDoctor).
- `initiative` (`objective_id`; puede referenciar un `wbs_node`/`project` de GNOS-PROY o una `proposal` de GNOS-DIAG, conectando los 3 módulos de verdad).

---

## GNOS-CRM — Pipeline de ventas + Comunicaciones

### Objetivo
Sistema de registro (system of record) del pipeline comercial completo — el mismo que GNOS-DIAG referencia como "el CRM va dando seguimiento a propuestas, escenarios, etc." — más el motor de comunicación (email/WhatsApp) con esos contactos. En BizDoctor hoy son 2 pantallas separadas (`crm` y `comunicacion`) que casi no se hablan entre sí; en GoNextSales-OS deben fusionarse en un solo módulo.

### Lógica de referencia ya construida en BizDoctor
- **CRM** (`src/app/caso/[id]/crm/CRMClient.tsx`): pipeline kanban real con 6 etapas (`pending` → `contacted` → `proposal_sent` → `negotiating` → `closed_won`/`closed_lost`), vista kanban y lista. Cada contacto: `name`, `company`, `role`, `email`, `phone`, `relationship_type` (client/prospect/supplier/partner/other), `notes`, `pipeline_stage`, `potential_value_monthly`, `close_probability` (alta/media/baja), `next_action`, `next_action_date`.
- **Comunicación** (`src/app/caso/[id]/comunicacion/ComunicacionClient.tsx`): catálogo editable de plantillas (`communication_templates`) por cuenta de consultor, categorizadas, canal email o WhatsApp, con asunto + cuerpo. Hoy es una biblioteca de consulta/copiado manual — no envía nada ni queda ligada a un contacto específico.

### Requisito explícito del dueño del producto: 2 puntos de activación para Comunicaciones

> Entiendo que recomiendas quitarlos de ahí. Solo dame una amplitud de alcance para que GNOS-CRM incluya el módulo de comunicaciones, y que sea activado fuera de los cuadros kanban y dentro de la ficha del cliente en el cuadro kanban. Fuera del cuadro kanban es necesario para enviar comunicaciones a grupos, categorías, individuales, etc.

Esto son 2 flujos distintos que GNOS-CRM debe soportar, no una sola pantalla:

1. **Dentro de la ficha del contacto (kanban):** al abrir un contacto individual, un botón "Enviar comunicación" que usa el catálogo de plantillas, precompletado con los datos de ESE contacto (nombre, empresa, etapa), y que registra el envío en su historial — comunicación 1:1, en contexto, sin salir de la tarjeta.
2. **Fuera del kanban (vista independiente, tipo "Campañas" o "Envíos"):** selector de audiencia por **grupo** (tag libre, no existe hoy en el schema — hay que agregarlo), **categoría** (`relationship_type` ya existe: cliente/prospecto/proveedor/aliado) o **individual** (búsqueda/multi-select de contactos puntuales) + plantilla + canal → envío masivo/segmentado. Esta vista NO existe hoy en BizDoctor ni siquiera en forma primitiva — es lo más nuevo de todo GNOS-CRM, el resto es reconectar piezas que ya existen.

### Gap de datos a cerrar (no existe en BizDoctor hoy)
- `tags`/`groups` en el contacto: BizDoctor solo tiene `relationship_type` (5 valores fijos) como única dimensión de agrupación. Para "grupos" libres (ej. "Asistentes Masterclass Julio", "Clientes Almacén Fiscal") se necesita un campo de etiquetas libre o una tabla de grupos con membresía muchos-a-muchos — no reusar `relationship_type` para esto, son dos ejes distintos (tipo de relación vs. agrupación ad-hoc de campaña).
- `communication_log`: hoy Comunicación no registra que algo se envió, solo permite copiar el texto. GNOS-CRM necesita una tabla de envíos reales (contact_id o audiencia, template_id, canal, enviado_por, enviado_en, estado de entrega si el canal lo soporta) — sin esto, el botón "Enviar" dentro de la ficha del contacto (punto 1 de arriba) no tiene dónde persistir su historial.

### Tradeoff a decidir antes de mover código: integración viva con BizDoctor
A diferencia de Escenarios/Tarifas/Propuestas (cero integración real, se pueden extraer sin dejar nada roto), el CRM de BizDoctor **sí tiene una integración funcionando**: contactos extraídos automáticamente de las entrevistas de M3 aparecen en `/caso/[id]/crm` vía un botón "Importar M3". Si CRM se saca por completo de BizDoctor, ese auto-import se rompe salvo que:
- (a) GNOS-CRM quede conectado de vuelta a BizDoctor vía API (integración cross-plataforma, mayor esfuerzo), o
- (b) se acepte que BizDoctor pierde esa conveniencia y los contactos de M3 se exportan/copian manualmente al nuevo CRM, o
- (c) el módulo de contactos se queda duplicado en ambos lados temporalmente hasta que (a) se construya.

No hay una respuesta obvia — depende de qué tan pronto GoNextSales-OS esté listo para recibir tráfico real vs. cuánto valor sigue dando el auto-import dentro de BizDoctor mientras tanto. Decisión pendiente del dueño del producto, no tomada aquí.

### Modelo de datos sugerido
- `contact` (mismo shape que `CRMClient.tsx` hoy, más `tags text[]` nuevo).
- `pipeline_stage` (las 6 ya validadas en BizDoctor, reutilizables tal cual).
- `communication_template` (mismo shape que `communication_templates` de BizDoctor — categoría, canal, asunto, cuerpo).
- `communication_log` (nuevo, ver gap arriba) — con `audience_type`: `'contact' | 'group' | 'category'` para diferenciar un envío 1:1 (desde la ficha) de uno masivo (desde la vista de campañas), y `audience_ref` (id de contacto, de grupo, o el valor de `relationship_type`).
- `contact_group` (nuevo, si se opta por tabla de grupos en vez de `tags[]` — más flexible para reportes de "cuántos hay en este grupo", pero más esfuerzo de construcción; `tags[]` es el MVP más barato).

---

## Cómo quedan conectados los 4 módulos (el ciclo completo)

GNOS-CRM es el registro base (contactos, pipeline, comunicaciones) sobre el que corren los otros 3: GNOS-DIAG capta y convierte (marketing → diagnóstico SPIN/TOC → propuesta cerrada, todo registrado como movimiento de etapa en GNOS-CRM) → al cerrar, genera un `project` en GNOS-PROY con EDT/cronograma real para ejecutar lo prometido → GNOS-BSC mide si esa ejecución mueve las métricas del cliente en sus 4 perspectivas, y sus `initiative` pueden apuntar de vuelta a tareas concretas de GNOS-PROY. No son 4 productos aislados — es un ciclo único: captación y relación (CRM) → venta consultiva basada en diagnóstico (DIAG) → ejecución gestionada (PROY) → medición estratégica (BSC), que además retroalimenta al `rate_card`/catálogo de GNOS-DIAG con qué iniciativas realmente movieron la aguja en clientes anteriores.

## Preguntas abiertas para quien retome esto en GoNextSales-OS

1. **GNOS-DIAG:** ¿el guion SPIN + el análisis TOC deben ser 100% conversación guiada por IA (como Nova en BizDoctor) o un formulario estructurado con análisis posterior por IA? La conversación guiada es mejor para la fase de Implicación (necesita adaptarse a la respuesta anterior), pero más cara/lenta que un formulario para la fase de Situación.
2. **GNOS-PROY:** ¿el EDT lo arma el consultor manualmente por engagement, o existen plantillas de EDT reutilizables por tipo de servicio (ej. "implementación de WMS" siempre tiene la misma estructura base de entregables)? Plantillas aceleran, pero BizDoctor ya decidió antes no sobre-construir catálogos configurables sin necesidad real — validar que la necesidad exista antes de construir plantillas.
3. **GNOS-BSC:** ¿las métricas y objetivos del BSC son del CLIENTE (como en BizDoctor hoy) o también hay un BSC interno de GoNextSales para medirse a sí misma como consultora? El texto original no lo aclara.
4. **Relación de datos:** ¿un mismo prospecto puede tener más de un ciclo GNOS-DIAG → GNOS-PROY → GNOS-BSC en el tiempo (cliente recurrente con engagements sucesivos), o el modelo asume un ciclo único de venta-ejecución-medición por cliente? Afecta si `project`/`strategic_objective` deben versionarse o ser 1:1 con el cliente.
5. **GNOS-CRM:** ¿se resuelve el tradeoff de integración con BizDoctor (opciones a/b/c de esa sección) antes o después de construir el resto del módulo? Construir la vista de envíos masivos sin definir esto primero arriesga tener que rehacerla si luego se decide mantener el auto-import de M3 en vivo.
