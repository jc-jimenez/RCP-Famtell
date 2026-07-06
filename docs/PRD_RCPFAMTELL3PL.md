# RCPFAMTELL3PL — PRD (v2, alcance delgado)

> Nuevo nombre del proyecto: **RCPFAMTELL3PL**. Refleja el alcance real: diagnóstico RCP enfocado en Famtell como operador 3PL, no una plataforma genérica multi-giro (ver sección 2).

> Reemplaza el alcance original de 52 pantallas / 4 roles / 8+módulos premium. Este documento define qué se conserva del código construido, qué se corta, y cuál es el objetivo no negociable del producto.

## 1. Objetivo del producto (north star)

RCP.ai existe para producir, para una empresa cliente (caso ancla: **Famtell**, operador logístico 3PL + Almacén Fiscal, Corredor CTT), un diagnóstico empresarial con IA que **termina siempre en tres entregables concretos**:

1. **Plan de rescate 0-90 días** — acciones concretas, accionables esta semana, no genéricas.
2. **Plan a 1 año** — cómo se sostiene y consolida lo logrado en los 90 días.
3. **Visión a 3 años** — cómo se escala el negocio a partir de esa base.

Todo módulo del sistema existe para alimentar con evidencia estos tres entregables. Si un módulo no aporta insumo directo al Plan 90d/1a/3a, no es núcleo.

Esto ya está construido y funcionando: `plan_90d`, `plan_1a`, `plan_3a` en el Brief (M7) — ver `src/app/caso/[id]/brief/BriefConsultorClient.tsx` y `BriefDirectorClient.tsx`. Es el corazón del producto, no una pantalla más.

## 2. Cliente ancla

**Famtell** — operador 3PL con Almacén Fiscal habilitado, Corredor CTT (Cuautitlán-Tultitlán-Tepotzotlán). El producto se diseña y prioriza para poder ejecutar bien este diagnóstico primero. Verticalización logística (Capacidad de Almacén, Monitor de Competencia 3PL) se mantiene como núcleo mientras Famtell sea el caso ancla — no se generaliza a "cualquier giro" todavía.

## 3. Núcleo que se conserva (código reutilizable, ~20k LOC)

| Área | Qué es | Por qué se queda |
|---|---|---|
| M1-M6 (Radiografías) | Entrevista con Nova por área: Comercial, Operativa, Contactos, Financiera, Competitiva, Interna | Insumo crudo para el diagnóstico |
| M7 (Síntesis + Plan) | Genera Brief: hallazgos + `plan_90d` + `plan_1a` + `plan_3a` | **Es el producto.** Entregable final |
| Sistema de créditos | Consumo/descuento por módulo, plan del consultor | Modelo comercial ya operativo |
| CRM ligero (8.1) | Contactos importados de M3, kanban de seguimiento | Usado activamente, base de ejecución post-Brief |
| Generador de propuestas (8.2) | Propuesta comercial con IA a partir del Brief | Monetiza el diagnóstico |
| Calculadora de tarifas (8.3) | Cotización rápida por tipo de proyecto | Bajo costo, alto uso |
| Tablero de KPIs + Check-in semanal (8.4/8.5) | Seguimiento del plan 90 días, semáforo, check-in lunes | Es cómo se demuestra que el plan 0-90d se está cumpliendo |
| Tracker de Capacidad de Almacén (8.6) | m² → pesos, ocupación, rotación | Núcleo mientras el ancla sea 3PL |
| Monitor de Competencia (8.10) | Comparativa radar vs competidores CTT | Núcleo mientras el ancla sea 3PL — simplificar a solo lectura si el input manual no se usa |
| Auth + rol Directivo | Login, invitación, activación, `/mi-caso` (ver Brief, KPIs) | Sin esto el dueño de la empresa no recibe el resultado |
| Admin (recortado) | Métricas básicas, gestión de consultores, catálogo de preguntas | Solo estas 3 — el resto se corta (ver abajo) |

## 4. Qué se corta (cero costo, cero valor hoy)

- **Premium A-G** (Valuación, Palancas financieras, Riesgo, M&A, Proyección, Brechas de rol, Capital humano) — son toggles sin sesiones, sin lógica de Nova, sin tablas propias. Cascarón puro. **Se elimina del PRD**; si algún día un cliente lo pide, se re-evalúa como módulo nuevo, no se rescata este código.
- **WhatsApp Business (8.12)** — endpoint placeholder, Twilio nunca integrado de verdad.
- **Integración SAT/ERP (8.13)** — no existe en código, solo era concepto.
- **Brief de Cierre Semana 12 (8.14)** — no existe en código. Si se necesita un cierre a semana 12, es una variante del Brief existente, no una pieza nueva.
- **Facturación en Admin** — UI vacía, Stripe no conectado ahí (el checkout de Stripe que sí funciona se queda, solo se corta la pantalla de admin).
- **Radar de Prospectos agnóstico a giro (8.7)** — mantenido pero fuera del núcleo: es una herramienta de prospección para el consultor, no alimenta el Plan 90d/1a/3a de Famtell directamente. Se conserva como utilidad secundaria, no se invierte más en generalizarlo.
- **Portal del Cliente (8.11)** — se mantiene mínimo (login + ver Brief), no se expande.

## 5. Roles (sin cambio de fondo, recorte de pantallas)

- **Consultor** — dueño del caso, corre M1-M7, genera Brief, da seguimiento con CRM/Propuestas/Tarifas/KPIs.
- **Directivo** (Famtell) — recibe invitación, responde módulos asignados, ve el Brief publicado y el tablero de KPIs.
- **Colaborador** — mandos medios de Famtell, responde módulos asignados.
- **Super Admin** — 3 pantallas: métricas, consultores, catálogo de preguntas. Se corta el resto.

## 6. Criterio para decidir features nuevas de aquí en adelante

Antes de construir algo nuevo, responder: *¿esto mejora directamente el Plan 90d, el Plan 1 año, o la Visión 3 años de Famtell — o el seguimiento de que se cumplan?* Si la respuesta es no, no entra al alcance ahora.

## 7. Modelo de puestos y mapeo de preguntas (GAP — pendiente de construir)

Verificado en el código (2026-07-06): hoy el "puesto de negocio" es un enum fijo de 6 valores hardcodeado (`director_general`, `gerente_comercial`, `gerente_operativo`, `cfo_contador`, `rrhh_admin`, `gerente_marketing`), igual para cualquier caso — ver `ParticipantesPanel.tsx` (perfiles) y `questions.suggested_roles` (catálogo). Decisión: esto no sirve, el catálogo de puestos debe ser **específico de cada empresa/caso**, creado por el consultor.

### Reglas del nuevo modelo

1. **Catálogo de puestos por caso** — el consultor da de alta los puestos reales de la empresa (para Famtell: los puestos que van a participar), independiente del catálogo genérico de otro caso. **Al crear cada puesto es obligatorio capturar su descriptivo de puesto** (texto: funciones y responsabilidades declaradas). El descriptivo pertenece al puesto, no a la persona que lo ocupa — si cambia quién ocupa el puesto, el descriptivo no cambia.
2. **Puesto de negocio ≠ rol de plataforma** — `case_users.role` (consultant/director/collaborator) sigue existiendo para permisos del sistema; el puesto de negocio es una dimensión aparte que determina qué preguntas le tocan a la persona.
3. **Análisis de brecha descriptivo vs. actividad real (retoma la idea de Premium F "Brechas de rol", cortado en la sección 4 — ya no es módulo aparte, es parte del núcleo).** Al generar el Brief, la IA compara el descriptivo del puesto contra lo que la persona describe que realmente hace en sus respuestas de módulo (principalmente M6 Radiografía Interna, pero cualquier módulo puede aportar evidencia). Identifica y reporta:
   - Alineación: el ocupante cumple con lo que dice su descriptivo.
   - Actividades fuera de descriptivo: tareas que el ocupante realiza y que no están cubiertas por el descriptivo del puesto (señal de sobre-carga, puesto mal definido, o estructura organizacional informal).
   - Descriptivo desactualizado o ambiguo: cuando el propio texto del descriptivo es insuficiente para evaluar alineación.
   Este hallazgo se incorpora como sección del Brief (Síntesis M7), no como pantalla separada.
3. **Preguntas base + mapeo por caso** — el sistema ya genera una serie de preguntas base por módulo (catálogo M1-M7 existente). Para cada caso, el consultor puede: activar/desactivar preguntas base (ya existe: `case_question_overrides.is_active`), modificar el texto (ya existe: `custom_text`), agregar preguntas nuevas propias del caso (ya existe: `case_custom_questions`) — y **además** asignar uno o más puestos del catálogo de ESE caso a cada pregunta (nuevo, no existe: hoy `suggested_roles` apunta al enum fijo, no a un catálogo dinámico).
4. **Pregunta sin puesto asignado = oculta.** Si el consultor no mapeó una pregunta a ningún puesto del caso, esa pregunta no se le muestra a nadie. Esto obliga a completar el mapeo antes de lanzar el caso — es un cambio de comportamiento respecto a hoy (donde `suggested_roles` vacío = visible para todos).

### Cambios de esquema necesarios (no construido aún)

- `case_job_positions` (id, case_id, name, job_description, created_at) — catálogo de puestos del caso. `job_description` obligatorio al crear.
- `case_users.job_position_id` → FK a `case_job_positions`, en paralelo a `role` (no lo reemplaza). Los campos `job_description_text`/`job_description_url` que hoy existen en `case_users` quedan obsoletos para este flujo — el descriptivo vive en el puesto, no en el usuario — y se retiran una vez migrado.
- Paso nuevo en la generación del Brief (M7): para cada puesto con `job_description`, cruzar con las respuestas de quien lo ocupa y producir el hallazgo de alineación/brecha descrito arriba.
- Redefinir el mapeo pregunta↔puesto para que sea contra `case_job_positions` en vez del enum fijo: puede reutilizarse `case_question_overrides.roles_override` (hoy `text[]` de nombres de enum) cambiándolo a `text[]`/tabla puente de `job_position_id`s, o crear `case_question_position_map (case_id, question_id, job_position_id)` como tabla muchos-a-muchos dedicada.
- `build-from-catalog.ts` deja de comparar `job_title` contra `suggested_roles` (enum) y pasa a resolver, por caso, qué preguntas están mapeadas al `job_position_id` del usuario — y si una pregunta no tiene ningún puesto mapeado en este caso, se excluye del guion (no se le pregunta a nadie).
- Pantalla nueva de consultor (no existe hoy): "Puestos y mapeo de preguntas" dentro del caso, para crear el catálogo de puestos y hacer el mapeo, antes de invitar participantes.

### Flujo resultante para el consultor (Famtell)

1. Crear el caso → dar de alta el catálogo de puestos de Famtell.
2. Revisar preguntas base por módulo: activar/desactivar, editar texto, agregar preguntas propias.
3. Mapear cada pregunta activa a uno o más puestos del catálogo de Famtell.
4. Invitar participantes y asignar a cada uno su puesto del catálogo (independiente de si su rol de plataforma es directivo o colaborador).
5. Nova solo pregunta a cada participante lo que está mapeado a su puesto.

## 8. Arquitectura de permisos de plataforma (decisión)

Se evaluó si el sistema de roles de plataforma (Super Admin, Consultor, Directivo, Colaborador) debe volverse un RBAC dinámico (roles y permisos editables en runtime, como el catálogo de puestos). **Decisión: no por ahora.**

- Hoy los checks de permiso están dispersos por rutas y páginas (`if (role === 'director')` repetido en decenas de archivos) — eso sí se corrige.
- **Se refactoriza a un módulo central de permisos** (`src/lib/permissions.ts` o equivalente): capacidades explícitas y pequeñas (ej. `ver_brief`, `editar_kpis`, `invitar_participantes`, `activar_modulo`, `gestionar_catalogo`) mapeadas a los 4 roles fijos. Todo el código consulta ese módulo en vez de comparar strings de rol directamente.
- **No se construye un catálogo de roles/permisos editable en base de datos ni una pantalla para crear roles nuevos.** Los 4 roles siguen fijos por diseño. Razón: es el mismo patrón que produjo los módulos Premium A-G (flexibilidad genérica construida sin un caso real que la necesite, terminó en cascarón — ver sección 4). Con un solo cliente ancla y 4 roles ya bien entendidos, el costo de un RBAC completo (más superficie de permisos que asegurar, más casos borde) no se justifica.
- Si en el futuro un segundo cliente/caso de uso requiere de verdad un rol nuevo, se re-evalúa el RBAC dinámico con esa necesidad concreta enfrente, no antes.

## 9. Catálogos adicionales a hacer configurables (GAP — pendiente de construir)

Mismo criterio de la sección 7 (nada configurable = costo de mantenimiento en código; todo configurable sin necesidad real = sobre-construcción). Se revisaron 6 catálogos hoy hardcodeados; se prioritizaron 3 para entrar al alcance ahora, ligados directamente al north star (sección 1):

### 9.1 KPIs del Tablero (8.4) — el más ligado al Plan 90d/1a/3a
Hoy `kpi_records` tiene 6 columnas fijas (ingresos, clientes activos, clientes nuevos, ocupación de almacén, contactos, tasa de cierre) — ver `KPIBoardClient.tsx`. El Plan 90 días de Famtell necesita medir los KPIs específicos de SU plan, no solo estos 6 genéricos.
- Cambio de esquema: de columnas fijas a modelo catálogo + valores — `case_kpi_definitions` (case_id, metric_key, label, target, unidad/formato, sort_order) + `kpi_records` pasa a guardar valores contra esas definiciones en vez de columnas fijas.
- El consultor define qué KPIs trackear al armar el Plan 90d (probablemente al momento de generar/editar el Brief), y esos mismos KPIs alimentan el Tablero y el Check-in semanal.

### 9.2 Módulos del diagnóstico (M1-M7)
Ya existe una tabla `module_templates` (code, name, description, is_active) de la que se lee el contenido — pero el **orden de secuencia y el costo en créditos siguen hardcodeados** (`MODULE_ORDER` en `api/modules/route.ts`, `MODULE_CREDITS` en `credits.ts`). Para permitir que un caso agregue un módulo propio (ej. algo específico de Famtell) sin tocar código:
- Agregar `sort_order` y `credit_cost` a `module_templates`.
- `/api/modules` inicializa los módulos del caso leyendo `module_templates` activos ordenados por `sort_order`, no del array hardcoded.

### 9.3 Plantillas de comunicación (8.8)
Hoy es un array `TEMPLATES` hardcoded en el propio componente de frontend — ni siquiera vive en base de datos. Se necesita:
- Tabla `communication_templates` (o `case_communication_templates` si son por caso) con CRUD real vía API, igual que preguntas/secciones.
- El consultor puede crear, editar y desactivar sus propias plantillas de email/WhatsApp para Famtell, en vez de depender de las que vienen fijas en código.

### Quedan fuera por ahora (sin necesidad real todavía)
Escenarios de crecimiento (8.9 — los 3 escenarios son fijos pero sus valores ya son editables en pantalla, suficiente por ahora), tipos de contacto/etapas de pipeline del CRM (8.1 — bajo impacto, son etiquetas internas), costos de créditos por módulo/acción (catálogo de precios, no de diagnóstico). Se re-evalúan si aparece una necesidad concreta.

## 10. Plan de construcción

Orden por dependencia real, no por importancia — cada fase deja el terreno listo para la siguiente. No se arranca una fase sin cerrar la anterior.

### Fase 0 — Limpieza (cortar lo descartado en la sección 4)
Eliminar código y rutas de Premium A-G, WhatsApp placeholder, Facturación en Admin, referencias muertas a SAT/ERP y Brief de Cierre Semana 12. Bajo riesgo, no depende de nada. Se hace primero para reducir la superficie de código antes de tocar permisos y el modelo de datos — menos cosas que arrastrar por accidente en los refactors siguientes.

### Fase 1 — Refactor de permisos de plataforma (sección 8)
Módulo central de capacidades por rol, reemplazando los checks de rol dispersos. Sin cambio visible para el usuario. Se hace antes de construir las pantallas nuevas de la Fase 2 para no construirlas dos veces (una con checks viejos, otra ya refactorizada).

### Fase 2 — Catálogo de puestos + mapeo de preguntas (sección 7) — el cambio de fondo
1. Migraciones: `case_job_positions`, `case_users.job_position_id`, tabla de mapeo pregunta↔puesto.
2. Pantalla de consultor "Puestos y mapeo de preguntas": crear puestos (con descriptivo obligatorio), activar/desactivar/editar/agregar preguntas del caso (esto ya existe, se integra), mapear preguntas a puestos.
3. Reescribir invitación de participantes (`ParticipantesPanel.tsx`): asignar puesto del catálogo del caso en vez de los 6 perfiles fijos.
4. Reescribir `build-from-catalog.ts` y el chat de Nova: filtrar por `job_position_id` del caso; pregunta sin puesto mapeado queda oculta.
5. Generación del Brief: agregar la sección de alineación descriptivo-vs-actividad real.
6. Retirar `job_description_text`/`job_description_url` de `case_users` una vez migrado.

Esta fase es la más grande y es bloqueante: mientras no esté lista, cualquier caso nuevo (incluido Famtell) seguiría operando con el modelo viejo de 6 perfiles fijos.

### Fase 3 — Catálogos configurables restantes (sección 9)
En este orden porque el de KPIs es el más grande y el más ligado al north star, y conviene que esté listo antes de que Famtell llegue a la etapa de seguimiento (semana 1 de ejecución post-Brief):
1. Módulos del diagnóstico — `sort_order`/`credit_cost` en `module_templates`, init dinámico. (Aislado, sin dependencias, se puede hacer en paralelo con Fase 2 si hay capacidad.)
2. KPIs del Tablero — de columnas fijas a catálogo + valores, conectado al Plan 90d del Brief.
3. Plantillas de comunicación — tabla nueva + CRUD. (El más chico y aislado, puede ir al final o en paralelo.)

### Fase 4 — QA end-to-end con el caso real de Famtell
Correr el flujo completo con el modelo nuevo: crear caso Famtell → dar de alta puestos reales → mapear preguntas → invitar participantes reales de Famtell → completar módulos → generar Brief (Plan 90d/1a/3a + hallazgo de brechas de puesto) → seguimiento con KPIs/check-in semanal. No se considera terminado hasta validarlo con datos reales de Famtell, no solo con cuentas de prueba.

### Qué puede avanzar en paralelo
Fase 0 no bloquea nada más y puede ir en cualquier momento. Dentro de la Fase 3, Módulos y Plantillas son independientes entre sí y de KPIs — se pueden repartir en paralelo si hay más de una persona construyendo. Todo lo demás es secuencial por las dependencias reales del modelo de datos.
