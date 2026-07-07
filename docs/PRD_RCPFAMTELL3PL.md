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

- **Premium A-G** (Valuación, Palancas financieras, Riesgo, M&A, Proyección, Brechas de rol, Capital humano) — **CORTADO (2026-07-06).** Tenían routing y toggle real en BD, pero verificado en código: sin `module_templates` ni prompts estáticos para A-G (`prompts/index.ts` solo cubre M1-M7), el chat se abría sin ningún guion de Nova. Cascarón real bajo una plomería que parecía completa. Eliminados: `src/app/premium/*`, `src/app/admin/premium/*`, `src/app/api/premium/route.ts`, `src/app/api/admin/premium/route.ts`, tipo `PremiumModuleCode`/`PremiumModule`, `PREMIUM_CREDITS`. La tabla `premium_modules` en Supabase se deja intacta (no se dropeó, bajo riesgo dejarla sin usar). Si algún día un cliente lo pide, se re-evalúa como módulo nuevo con su propio catálogo de preguntas, no se rescata este código.
- **Facturación en Admin** — **CORTADO (2026-07-06).** Verificado: era una página estática (redirección a Stripe Dashboard + precios hardcoded), sin lógica propia. Eliminado `src/app/admin/facturacion/page.tsx`. El checkout de Stripe real (`/api/billing/checkout`, webhook) no se tocó, sigue funcionando.
- **Integración SAT/ERP (8.13)** — no existe en código, solo era concepto. Nada que cortar.
- **Brief de Cierre Semana 12 (8.14)** — no existe en código. Si se necesita un cierre a semana 12, es una variante del Brief existente, no una pieza nueva.
- **Radar de Prospectos agnóstico a giro (8.7)** — mantenido pero fuera del núcleo: es una herramienta de prospección para el consultor, no alimenta el Plan 90d/1a/3a de Famtell directamente. Se conserva como utilidad secundaria, no se invierte más en generalizarlo.
- **Portal del Cliente (8.11)** — se mantiene mínimo (login + ver Brief), no se expande.

> ⚠️ **Corrección (2026-07-06):** este documento decía que WhatsApp Business (8.12) era placeholder — **era un error de la auditoría inicial.** Verificado en código: `sendWhatsApp` (`src/lib/twilio.ts`) es una integración real con la API de Twilio, usada de verdad en invitaciones (`api/invitations/route.ts`) y recordatorios de check-in semanal (`api/cron/checkin-reminder/route.ts`). **No se corta — es parte del núcleo**, coherente con lo que ya indicaba la memoria del proyecto (Fase 2 completada). Se mueve a la sección 3 (núcleo) mentalmente; no se repite la tabla completa aquí.

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

**✅ Paso 1-2 de la Fase 2 completados y verificados en navegador (2026-07-06):** migración 023 corrida en Supabase; panel "Puestos" agregado a `/dashboard/caso/[id]/plan` (crear/editar/borrar puesto con descriptivo obligatorio); mapeo pregunta↔puesto vía `job_position_ids` en `case_question_overrides`/`case_custom_questions`. Probado end-to-end con la cuenta de consultor real: crear puesto → mapear pregunta → recargar página → el mapeo persiste. El toggle de roles (enum viejo) se dejó visible en paralelo, marcado como legado — se retira en el paso 4 cuando el filtro de Nova use `job_position_ids` en vez de `suggested_roles`.

**✅ Paso 3 completado y verificado (2026-07-06):** `ParticipantesPanel.tsx` reescrito — el consultor elige el puesto del catálogo del caso (no los 6 perfiles fijos) y por separado el rol de plataforma (Director General vs Colaborador, independientes). `api/invitations/route.ts` ahora exige `jobPositionId` y lo guarda en `case_users.job_position_id`. Probado end-to-end: invitación creada con puesto real, `job_position_id` confirmado vía API de Supabase apuntando al UUID correcto del puesto. Si el caso no tiene puestos creados todavía, el modal de invitar bloquea el envío y dirige a crear puestos primero en Plan de Diagnóstico.

**✅ Paso 4 completado (2026-07-06):** `api/ai/chat/route.ts` y `build-from-catalog.ts` reescritos — Nova ahora filtra por `job_position_id` del `case_user` (antes comparaba `job_title` contra un enum de roles). Una pregunta sin ningún puesto mapeado en `job_position_ids` queda excluida del guion, no se le pregunta a nadie. **De paso se corrigió un gap real**: las preguntas personalizadas del caso (`case_custom_questions`) nunca llegaban al chat de Nova — el endpoint solo leía el catálogo base; ahora se fusionan correctamente por sección. Se retiró el toggle de roles legado de `PlanDiagnosticoClient.tsx` (ya no tenía ningún efecto real).

Verificado replicando la consulta exacta de `chat/route.ts` contra la base real: de 29 preguntas de M1, solo la única mapeada al puesto "Gerente de Almacén Fiscal" queda visible — confirma el filtrado a nivel de datos. **No verificado con una conversación real de Nova en navegador**: el link de activación de invitaciones apunta al dominio de producción (`NEXT_PUBLIC_APP_URL` fijo) en vez del origin de la request local, lo cual bloquea activar cuentas de prueba nuevas en desarrollo — bug preexistente no relacionado a esta fase, delegado como tarea aparte.

Con esto, la Fase 2 completa (pasos 1-4) queda cerrada.

### Flujo resultante para el consultor (Famtell)

1. Crear el caso → dar de alta el catálogo de puestos de Famtell.
2. Revisar preguntas base por módulo: activar/desactivar, editar texto, agregar preguntas propias.
3. Mapear cada pregunta activa a uno o más puestos del catálogo de Famtell.
4. Invitar participantes y asignar a cada uno su puesto del catálogo (independiente de si su rol de plataforma es directivo o colaborador).
5. Nova solo pregunta a cada participante lo que está mapeado a su puesto.

### Catálogo real de puestos de Famtell (2026-07-06, confirmado por el usuario)

Los 13 puestos reales del organigrama de Famtell, para cargar cuando se arme el caso de producción:
Director General · Gerente Comercial · Gerente de Operaciones · Gerente Administración · Asesor Comercial Interno · Asesor Comercial Externo · Gerente de Almacén · Analista Facturación · Coordinador General de Almacén · Analista Administrativo · Supervisor Mantenimiento y Seguridad · Operador Montacarguista · Auxiliar General.

**Decisión de diseño (explícita del usuario):** qué puestos participan en las entrevistas y con qué preguntas es decisión del consultor con el equipo directivo — el sistema no lo predefine ni lo limita. Por eso los catálogos son configurables (altas/bajas/cambios) y las preguntas asignables por puesto. El sistema solo provee la mecánica.

### 7.1 Seguimiento de avance de entrevistas (GAP — pendiente de construir)

Requerimiento del usuario (2026-07-06): si un usuario está configurado con rol + puesto + preguntas asignadas, el sistema debe validar que **todos** los asignados hayan contestado, y el consultor necesita visibilidad y control sobre ese avance.

Esto resuelve el hueco de diseño detectado en el recorrido conceptual: hoy `modules` tiene una sola fila por caso+módulo (`UNIQUE(case_id, module_code)`), así que **el primer participante que termina marca todo el módulo como completado** y desbloquea el siguiente, aunque otros puestos asignados no hayan empezado.

Diseño acordado:
- **Panel de avance de entrevistas** (pantalla de consultor): matriz participante × módulo con estado pendiente / en curso / completado, leyendo de `sessions` (que ya guarda `user_id`, `module_code`, `completed` — el dato existe, falta la vista agregada). Incluye acción de recordatorio (email/WhatsApp) por participante.
- **Advertencia, no bloqueo**: al generar el Brief (M7) o al marcar un módulo del caso como cerrado, si hay entrevistas pendientes el sistema muestra "faltan X entrevistas de Y participantes" y el consultor decide explícitamente si continúa sin terminar o da seguimiento. El control queda en el humano, no en una regla rígida.
- **Semántica de `modules.status`**: dejar de marcar el módulo del caso como `completed` con el primer participante — el estado del caso se deriva del conjunto de sesiones de los participantes asignados, o lo cierra el consultor manualmente.

## 8. Arquitectura de permisos de plataforma (decisión)

Se evaluó si el sistema de roles de plataforma (Super Admin, Consultor, Directivo, Colaborador) debe volverse un RBAC dinámico (roles y permisos editables en runtime, como el catálogo de puestos). **Decisión: no por ahora.**

- Hoy los checks de permiso están dispersos por rutas y páginas (`if (role === 'director')` repetido en decenas de archivos) — eso sí se corrige.
- **Se refactoriza a un módulo central de permisos** (`src/lib/permissions.ts` o equivalente): capacidades explícitas y pequeñas (ej. `ver_brief`, `editar_kpis`, `invitar_participantes`, `activar_modulo`, `gestionar_catalogo`) mapeadas a los 4 roles fijos. Todo el código consulta ese módulo en vez de comparar strings de rol directamente.
- **No se construye un catálogo de roles/permisos editable en base de datos ni una pantalla para crear roles nuevos.** Los 4 roles siguen fijos por diseño. Razón: es el mismo patrón que produjo los módulos Premium A-G (flexibilidad genérica construida sin un caso real que la necesite, terminó en cascarón — ver sección 4). Con un solo cliente ancla y 4 roles ya bien entendidos, el costo de un RBAC completo (más superficie de permisos que asegurar, más casos borde) no se justifica.
- Si en el futuro un segundo cliente/caso de uso requiere de verdad un rol nuevo, se re-evalúa el RBAC dinámico con esa necesidad concreta enfrente, no antes.

**✅ Fase 1 completada (2026-07-06).** Se creó `src/lib/permissions.ts` con `Capability` (7 capacidades: `manage_catalog`, `manage_consultores`, `view_platform_metrics`, `manage_platform_credits`, `send_manual_whatsapp`, `create_share_links`, `access_collaborator_workspace`), `hasCapability(role, capability)` e `isSuperAdminEmail(email)` como única fuente de verdad. Se refactorizaron 11 archivos que comparaban rol/email directamente.

**🔴 Hallazgo de seguridad corregido durante el refactor:** `/admin/catalogo` (página) y sus rutas API (`api/admin/catalogo/questions`, `api/admin/catalogo/sections`, verbos POST/PATCH/DELETE) **no verificaban que el usuario fuera Super Admin** — solo exigían sesión válida. Cualquier consultor, directivo o colaborador autenticado podía editar el catálogo global de preguntas/secciones usado por todos los casos. Corregido agregando el check en las 3 rutas. Esto confirma el valor de centralizar los checks: estaba disperso y a alguien se le olvidó en estos 3 lugares.

## 9. Catálogos adicionales a hacer configurables (GAP — pendiente de construir)

Mismo criterio de la sección 7 (nada configurable = costo de mantenimiento en código; todo configurable sin necesidad real = sobre-construcción). Se revisaron 6 catálogos hoy hardcodeados; se prioritizaron 3 para entrar al alcance ahora, ligados directamente al north star (sección 1):

### 9.1 KPIs del Tablero (8.4) — el más ligado al Plan 90d/1a/3a
Hoy `kpi_records` tiene 6 columnas fijas (ingresos, clientes activos, clientes nuevos, ocupación de almacén, contactos, tasa de cierre) — ver `KPIBoardClient.tsx`. El Plan 90 días de Famtell necesita medir los KPIs específicos de SU plan, no solo estos 6 genéricos.
- Cambio de esquema: de columnas fijas a modelo catálogo + valores — `case_kpi_definitions` (case_id, metric_key, label, target, unidad/formato, sort_order) + `kpi_records` pasa a guardar valores contra esas definiciones en vez de columnas fijas.
- El consultor define qué KPIs trackear al armar el Plan 90d (probablemente al momento de generar/editar el Brief), y esos mismos KPIs alimentan el Tablero y el Check-in semanal.

**✅ Completado y verificado (2026-07-06):** migración 025 crea `case_kpi_definitions` y agrega `values jsonb` a `kpi_records` (columnas viejas se dejan sin uso, no se dropean — `kpi_records` no tenía ninguna fila en todo el sistema, no hizo falta backfill). `KPIBoardClient.tsx` reescrito: el consultor define los KPIs del caso (nombre, meta, unidad) en un panel dentro del Tablero; el directivo captura valores semanales solo para los KPIs ya definidos; cards y gráficas se generan dinámicamente por cada KPI, no hardcoded. API nueva `case-kpi-definitions` (CRUD). `api/kpis` ahora guarda `values` como JSON en vez de columnas sueltas.

Verificado end-to-end en navegador: creado KPI "Ocupación de almacén" (meta 80%), capturada semana 1 con valor 65%, card y gráfica reflejan el dato real con semáforo correcto (65/80 = 81% → ámbar).

**Fuera de alcance, documentado como límite conocido:** el check-in semanal (`check_ins`, Módulo 8.5) sigue con sus propias columnas fijas (contactos, ocupación de almacén, progreso) — es una tabla de pulso cualitativo con análisis de IA, no una simple captura numérica; unificarla con el catálogo de KPIs sería un alcance mayor al pedido en esta sección, no se tocó.

Con esto, 2 de los 3 catálogos priorizados de la sección 9 quedan completos (Módulos, KPIs). Sigue Plantillas de comunicación (9.3).

### 9.2 Módulos del diagnóstico (M1-M7)
Ya existe una tabla `module_templates` (code, name, description, is_active) de la que se lee el contenido — pero el **orden de secuencia y el costo en créditos siguen hardcodeados** (`MODULE_ORDER` en `api/modules/route.ts`, `MODULE_CREDITS` en `credits.ts`). Para permitir que un caso agregue un módulo propio (ej. algo específico de Famtell) sin tocar código:
- Agregar `sort_order` y `credit_cost` a `module_templates`.
- `/api/modules` inicializa los módulos del caso leyendo `module_templates` activos ordenados por `sort_order`, no del array hardcoded.

**✅ Completado y verificado (2026-07-06):** migración 024 agrega `credit_cost` (`sort_order` ya existía desde la migración 011). `api/modules/route.ts` y `api/sessions/route.ts` reescritos para leer orden y costo desde `module_templates` en vez de los arrays `MODULE_ORDER`/`MODULE_CREDITS` (este último se eliminó de `credits.ts`, ya no se usa). `ModuleStartClient.tsx` ahora muestra el costo real devuelto por la API en el 402, no un valor estático. Verificado end-to-end con un caso nuevo real: init de módulos correcto (M1 activo, resto bloqueado, orden de `module_templates`), sesión creada, módulo M1 completado con `credits_used: 10` desde `module_templates.credit_cost`, M2 desbloqueado automáticamente.

**Regresión encontrada y corregida en el camino:** el asistente de "Nuevo caso" (`dashboard/nuevo-caso/page.tsx`) tenía su propio paso de invitación al directivo que nunca mandaba `jobPositionId` — con el requisito agregado en la Fase 2 (paso 3), esa invitación habría fallado siempre. Se corrigió para que ese paso cree el puesto en el catálogo del caso (con descriptivo, ahora campo obligatorio en ese formulario) antes de invitar. Verificado end-to-end: puesto creado, `case_users.job_position_id` apunta correctamente a él.

**Limitación conocida, no resuelta en este paso:** el orden de módulos (`MODULE_ORDER`) sigue duplicado como array literal en 3 lugares de solo-visualización (`portal/[token]/page.tsx`, `caso/[id]/page.tsx`, `dashboard/caso/[id]/page.tsx`) — no afecta la lógica de negocio (secuencia, créditos), solo la lista de progreso que se muestra. No se tocó por alcance: unificarlo requeriría que esas pantallas también consulten `module_templates`, que es un cambio de UI más amplio, no lo que pedía esta sección del PRD.

### 9.3 Plantillas de comunicación (8.8)
Hoy es un array `TEMPLATES` hardcoded en el propio componente de frontend — ni siquiera vive en base de datos. Se necesita:
- Tabla `communication_templates` (o `case_communication_templates` si son por caso) con CRUD real vía API, igual que preguntas/secciones.
- El consultor puede crear, editar y desactivar sus propias plantillas de email/WhatsApp para Famtell, en vez de depender de las que vienen fijas en código.

**✅ Completado y verificado (2026-07-06):** migración 026 crea `communication_templates`, por CUENTA de consultor (no global entre consultores, no por caso individual — el consultor arma su propia librería y la reutiliza en todos sus casos). Se migran las 11 plantillas hardcoded como seed a cada cuenta existente para no perder el punto de partida. `ComunicacionClient.tsx` reescrito con panel "Gestionar plantillas" (crear/editar/activar-desactivar/borrar) visible solo para el consultor; el directivo solo ve y usa las plantillas activas.

Verificado end-to-end en navegador: las 11 plantillas migradas se ven correctamente agrupadas por categoría; desactivar una plantilla la saca de la lista de uso (confirmado por API); crear una plantilla nueva persiste correctamente. Nueva API `communication-templates` (CRUD).

**Limitación conocida:** cuentas de consultor creadas después de esta migración no reciben las 11 plantillas de seed automáticamente — empiezan con la librería vacía. Automatizar el seed en el alta de cuenta queda fuera de alcance de este paso.

Con esto, los 3 catálogos priorizados de la sección 9 quedan completos: Módulos, KPIs, Plantillas de comunicación.

### Quedan fuera por ahora (sin necesidad real todavía)
Escenarios de crecimiento (8.9 — los 3 escenarios son fijos pero sus valores ya son editables en pantalla, suficiente por ahora), tipos de contacto/etapas de pipeline del CRM (8.1 — bajo impacto, son etiquetas internas), costos de créditos por módulo/acción (catálogo de precios, no de diagnóstico). Se re-evalúan si aparece una necesidad concreta.

## 10. Plan de construcción

Orden por dependencia real, no por importancia — cada fase deja el terreno listo para la siguiente. No se arranca una fase sin cerrar la anterior.

### Fase 0 — Limpieza (cortar lo descartado en la sección 4) ✅ COMPLETADA (2026-07-06)
Eliminado: Premium A-G (páginas, rutas API, tipos, costos de crédito) y Facturación en Admin. WhatsApp se verificó como núcleo real durante la ejecución y no se tocó (ver corrección en sección 4). SAT/ERP y Brief de Cierre Semana 12 no existían en código, no había nada que cortar. `npx tsc --noEmit` limpio tras la limpieza.

### Fase 1 — Refactor de permisos de plataforma (sección 8) ✅ COMPLETADA (2026-07-06)
Módulo central de capacidades por rol, reemplazando los checks de rol dispersos. Sin cambio visible para el usuario. Se hace antes de construir las pantallas nuevas de la Fase 2 para no construirlas dos veces (una con checks viejos, otra ya refactorizada).

### Fase 2 — Catálogo de puestos + mapeo de preguntas (sección 7) — el cambio de fondo ✅ COMPLETADA (2026-07-06)
1. Migraciones: `case_job_positions`, `case_users.job_position_id`, tabla de mapeo pregunta↔puesto.
2. Pantalla de consultor "Puestos y mapeo de preguntas": crear puestos (con descriptivo obligatorio), activar/desactivar/editar/agregar preguntas del caso (esto ya existe, se integra), mapear preguntas a puestos.
3. Reescribir invitación de participantes (`ParticipantesPanel.tsx`): asignar puesto del catálogo del caso en vez de los 6 perfiles fijos.
4. Reescribir `build-from-catalog.ts` y el chat de Nova: filtrar por `job_position_id` del caso; pregunta sin puesto mapeado queda oculta.
5. Generación del Brief: agregar la sección de alineación descriptivo-vs-actividad real.
6. Retirar `job_description_text`/`job_description_url` de `case_users` una vez migrado.

Esta fase es la más grande y es bloqueante: mientras no esté lista, cualquier caso nuevo (incluido Famtell) seguiría operando con el modelo viejo de 6 perfiles fijos.

### Fase 3 — Catálogos configurables restantes (sección 9) ✅ COMPLETADA (2026-07-06)
En este orden porque el de KPIs es el más grande y el más ligado al north star, y conviene que esté listo antes de que Famtell llegue a la etapa de seguimiento (semana 1 de ejecución post-Brief):
1. Módulos del diagnóstico — `sort_order`/`credit_cost` en `module_templates`, init dinámico. (Aislado, sin dependencias, se puede hacer en paralelo con Fase 2 si hay capacidad.)
2. KPIs del Tablero — de columnas fijas a catálogo + valores, conectado al Plan 90d del Brief.
3. Plantillas de comunicación — tabla nueva + CRUD. (El más chico y aislado, puede ir al final o en paralelo.)

### Fase 4 — QA end-to-end con el caso real de Famtell ✅ SIMULACIÓN COMPLETADA (2026-07-06)
Correr el flujo completo con el modelo nuevo: crear caso Famtell → dar de alta puestos reales → mapear preguntas → invitar participantes reales de Famtell → completar módulos → generar Brief (Plan 90d/1a/3a + hallazgo de brechas de puesto) → seguimiento con KPIs/check-in semanal. No se considera terminado hasta validarlo con datos reales de Famtell, no solo con cuentas de prueba.

**Resultado de la simulación (datos ficticios realistas de Famtell, decisión del usuario):**
- Flujo completo verificado: caso Famtell creado → 6 puestos con descriptivo → 137 preguntas mapeadas por puesto → 6 participantes (2 activados, 4 invitaciones pendientes) → conversación REAL con Nova verificada en navegador (el Gerente de Operaciones solo recibe sus preguntas; la pregunta estratégica de M&A mapeada solo al Director General nunca le aparece) → 7 módulos completados con conversaciones reales de la API de Claude → desbloqueo secuencial y descuento de créditos correctos (el sistema incluso bloqueó M7 por créditos insuficientes: la validación funciona) → Brief completo generado (7 diagnósticos, 6 JTBD comerciales, 5 segmentos, 8 prioridades, 34 acciones 90d, 28 iniciativas 6m, 9 objetivos 1a, visión 3a) → wizard de 9 etapas aprobado → publicado → verificado que el Director General ve el Brief completo con los 4 planes.

**3 bugs reales encontrados y corregidos durante el QA:**
1. `executive_summary` nunca podía generarse — el endpoint parseaba como JSON una sección que pide prosa plana. Corregido en `api/brief/generate/route.ts`.
2. `max_tokens: 3000` truncaba `plan_90d` a media generación (12 semanas de acciones no caben) — JSON cortado, fallaba siempre. Subido a 8000 y verificado.
3. **La etapa "JTBD Comercial" del Brief no podía persistir jamás**: la columna `jtbd_comercial` no existía en `brief_documents` (ninguna migración la creó) Y `api/brief/route.ts` ignoraba el error de PostgREST devolviendo 200 con `brief: null` — pérdida de datos silenciosa. Corregidos ambos: migración 027 + manejo de error en el guardado.

**Pendiente para cerrar la Fase 4 de verdad (con datos reales):** repetir el alta del caso con los 13 puestos reales del organigrama (sección 7), con los participantes reales de Famtell decididos por el consultor y el equipo directivo. Además quedaron como gaps documentados: el hallazgo de brechas descriptivo-vs-actividad en el Brief (sección 7, regla 3 — no construido aún), el panel de avance de entrevistas (sección 7.1) y el check-in semanal post-Brief (no ejercitado en esta simulación).

### Qué puede avanzar en paralelo
Fase 0 no bloquea nada más y puede ir en cualquier momento. Dentro de la Fase 3, Módulos y Plantillas son independientes entre sí y de KPIs — se pueden repartir en paralelo si hay más de una persona construyendo. Todo lo demás es secuencial por las dependencias reales del modelo de datos.

## 11. Validación contra el Kit de Diagnóstico Famtell (2026-07-06)

Se revisó completo `PlanRCP_Famtell_KitDiagnostico.docx` (7 módulos + síntesis, ~30 instrumentos) contra el catálogo de 137 preguntas ya cargado. Hallazgo clave: **el Kit no es un cuestionario conversacional puro — mezcla 3 tipos de contenido en cada módulo:**

1. **Entrevista narrativa/reflexiva** (visión, opinión) — ya cubierta por Nova. Confirmado 1:1: las preguntas 🔍 AGENDA (señales de crecimiento/redimensionamiento/salida) del documento coinciden literalmente con las ya cargadas en el catálogo.
2. **Datos duros puntuales** (facturación, m², headcount) — Nova puede preguntarlos conversacionalmente, no es gap.
3. **Tablas de muchas filas** (lista de clientes, competidores, costos por servicio, KPIs a 3 meses) — **no funciona como entrevista conversacional**, necesita otro mecanismo.

### Mapeo por módulo (resumen)
- **M1**: 1.1 entrevista → Nova. 1.2-1.5 (mapa de clientes, concentración 80/20, altas/bajas, servicios estrella) → tablas, gap.
- **M2**: 2.1/2.4 (capacidad, turnos) → Nova, pero verificar que coincida con Tracker de Capacidad (8.6) ya construido. 2.2/2.3 (inventario de equipos, servicios no comercializados con costo/precio/margen) → tablas, gap. 2.5 → Nova (ya mapeada).
- **M3**: 3.1-3.5 → 100% tabular, **ya lo resuelve el CRM (8.1)**, no se toca.
- **M4**: 4.1/4.3/4.4 → Nova + adjuntar documento (M4 ya soporta attachments). 4.2 (rentabilidad por línea de servicio) → tabla, verificar si la cubre Calculadora de Tarifas (8.3). 4.5 → Nova.
- **M5**: 5.1/5.2 (mapa de competidores, benchmark de tarifas) → tabla; **Monitor de Competencia (8.10) hoy es un radar de atributos 1-5, no una tabla de tarifas por servicio — posible desalineación a verificar**. 5.3-5.5 → Nova.
- **M6**: 6.1 (cuestionario de clima) → **el documento pide explícitamente que sea ANÓNIMO** ("Google Forms por WhatsApp"), choca con el modelo de puesto identificado de la Fase 2 — requiere mecanismo aparte. 6.2-6.4 (talento, quick wins, riesgos) → tablas de evaluación, gap.
- **M7**: 7.1/7.3B/7.4/7.5 → **ya automatizado** por el Brief (`plan_90d/1a/3a`, IER vía `agenda_signals`). La tabla 7.4 de KPIs coincide campo por campo con el catálogo de KPIs configurable recién construido en Fase 3.

### 3 decisiones tomadas con el usuario (2026-07-06)

**1. Tablas de listas largas → mecanismo genérico reutilizable, no una pantalla por tabla.**
- `case_table_instruments` (case_id, module_code, name, columns jsonb — array de `{key, label, type}`) + `case_table_rows` (instrument_id, row_data jsonb, sort_order).
- Un solo componente de tabla editable genérica (agregar/editar/borrar fila) que renderiza según las columnas del instrumento.
- Botón "Subir documento" por tabla — reutiliza el patrón de adjuntar archivo a Claude que ya existe en M4: la IA extrae filas del documento y pre-llena la tabla; el consultor revisa antes de guardar. **Ambas vías conviven** (llenado manual + IA), decisión explícita del usuario.
- Se mapea a puesto igual que las preguntas (mismo campo `job_position_ids`).
- Cubre: mapa de clientes/concentración/altas-bajas/servicios (M1), inventario de equipos/servicios no comercializados (M2), rentabilidad por servicio (M4, si Tarifas no la cubre), competidores/benchmark (M5, si Competencia no la cubre), talento/quick wins/riesgos (M6). No toca M3 (CRM) ni M7 (KPIs).

**2. Encuesta de clima (6.1) → anónima de verdad, sin rastreo de IP.**
- Decisión explícita del usuario: confidencialidad real, no inferencia de identidad por IP (se le explicó el riesgo: si el equipo se entera de que la "encuesta anónima" registraba IPs, se rompe la confianza que la anonimidad busca dar — contraproducente).
- En vez de eso: **preguntas sembradas de clasificación** al inicio del formulario (ej. "¿En qué área trabajas? Operación/Comercial/Administración/Dirección", "¿Tienes personal a tu cargo?") — el empleado autodeclara categoría amplia, nunca identidad.
- Mecanismo: link público sin login (mismo patrón que Portal del Cliente) — `case_climate_surveys` (token, caso, abierta/cerrada) + `case_climate_responses` (sin user_id, sin IP, solo área/nivel autodeclarados + respuestas). El consultor ve agregados por área, nunca fila con nombre.

**3. Alineación de campos (Capacidad de Almacén / Monitor de Competencia / Calculadora de Tarifas)** — auditar los campos reales del código contra lo que pide el Kit (secciones 2.1/2.2, 5.1/5.2, 4.2) antes de construir nada nuevo — puede que ya sirvan casi tal cual, o falten 2-3 campos.

**✅ Auditoría completada (2026-07-07):**
- **Tracker de Capacidad** (`CapacidadClient.tsx`): cubre bien lo genérico (m², posiciones de rack, ocupación, ingresos), pero modela UN solo almacén genérico — **falta el Almacén Fiscal como entidad separada** (¿habilitado?, m² propios, régimen aduanero, # clientes usándolo, acreditación SAT vigente), que el Kit marca como "el diferencial crítico" de Famtell. También faltan altura libre (clear height) y andenes de carga/descarga. **Gap real, requiere ajuste directo a esta pantalla** (no al mecanismo genérico, porque son cálculos/KPIs derivados, no una lista de filas).
- **Monitor de Competencia** (`CompetenciaClient.tsx`): mide percepción cualitativa (radar 1-5: precio, calidad, velocidad...). El Kit 5.1/5.2 pide algo **distinto y complementario**: mapa de competidores con "¿tiene Almacén Fiscal? Sí/No" + benchmark de tarifas reales en pesos por servicio (almacenaje m²/mes, picking por pieza, etc.). No es el mismo instrumento con campos de menos — el benchmark de tarifas es candidato para la tabla genérica; agregar solo el campo booleano de Almacén Fiscal al radar existente.
- **Calculadora de Tarifas** (`TarifasClient.tsx`): **desalineación de fondo, no de campos** — cotiza el trabajo de consultoría (horas del consultor × tarifa), mientras que el Kit 4.2 pide la rentabilidad de los servicios que Famtell vende a sus clientes (precio/costo/margen/volumen por servicio 3PL). Son dos herramientas distintas que comparten nombre. El 4.2 necesita su propia tabla — va al mecanismo genérico, no se toca la Calculadora existente.

**Conclusión:** de los 3, solo el Tracker de Capacidad necesita ajuste directo (sección de Almacén Fiscal). Los otros dos casos confirman que esos datos van a la tabla genérica del punto 1, no a las pantallas existentes — reduce el alcance real de "ajustar pantallas" a una sola.

### Orden de ejecución acordado (orden real de construcción: 1, 3, 2, 4 pendiente)
1. ~~Auditoría de campos~~ ✅ completada.
2. ~~Encuesta de clima anónima~~ ✅ completada y validada (2026-07-07).
3. ~~Tabla editable genérica + carga con IA~~ ✅ completada y validada (2026-07-07).
4. Ajuste puntual al Tracker de Capacidad: sección de Almacén Fiscal separada + altura libre + andenes — pendiente.

### 2. Encuesta de clima anónima — implementación (✅ 2026-07-07)

- Migración `029_case_climate_surveys.sql`: `case_climate_surveys` (case_id, token uuid único, title, questions jsonb, status draft/open/closed) + `case_climate_responses` (survey_id, `area` y `tiene_gente_a_cargo` autodeclarados, answers jsonb) — **sin user_id, sin ip_address, sin ninguna columna identificable, a propósito**. RLS: solo el consultor dueño gestiona/lee; el envío público NO pasa por INSERT directo ni por policy de `anon`, sino por la función `SECURITY DEFINER` `submit_climate_response(token, area, tiene_gente_a_cargo, answers)`, que valida server-side que la encuesta siga `open` antes de insertar (confirmado con test: POST directo a una encuesta ya cerrada devuelve 403 aunque se conozca el token). Lectura pública vía `get_climate_survey_by_token(token)`, mismo patrón que `client_share_links` (migración 016) pero de escritura, no solo lectura.
- Preguntas sembradas por default = las 10 exactas del Kit 6.1, con 5 tipos de pregunta (`open`, `number`, `scale_1_5`, `choice`, `choice_text`) — `src/lib/climateQuestions.ts`.
- UI consultor: `/caso/[id]/clima` (`ClimaClient.tsx`, tab "Clima" en `CasoTabs.tsx`) — crear encuesta (se siembra sola), abrir/cerrar, copiar link público, ver respuestas con 1 agregado numérico (promedio de comunicación interna) + lista de respuestas individuales (sin nombre, solo área/nivel + timestamp). Solo consultor gestiona (mismo criterio que Tablas — no se agregó a `DirectorTabs`).
- UI pública: `/clima/[token]` (sin login, sin `AppShell`) — clasificación (área + ¿tiene gente a su cargo?) autodeclarada seguida de las preguntas dinámicas por tipo; si la encuesta está en `draft`/`closed` muestra mensaje en vez de formulario.
- **Validado end-to-end en navegador real, incluyendo sesión verdaderamente anónima** (logout completo antes de visitar el link público): crear encuesta como consultor → abrir → visitar el link sin sesión → llenar clasificación + 4 preguntas de distintos tipos → enviar → confirmar en BD que la fila guardada solo tiene `area`, `tiene_gente_a_cargo`, `answers`, `created_at` (nada más) → ver el agregado y el detalle en el panel del consultor → cerrar encuesta → confirmar que un POST directo al mismo token ya devuelve 403.
- Datos de prueba (encuesta + respuesta) borrados tras validar, mismo criterio que en Tablas.

### 3. Tablas editables genéricas — implementación (✅ 2026-07-07)

- Migración `028_case_table_instruments.sql`: `case_table_instruments` (case_id, module_code, name, description, columns jsonb, job_position_ids uuid[], sort_order) + `case_table_rows` (instrument_id, row_data jsonb, sort_order). RLS: consultor dueño `FOR ALL`; case_user con puesto en `job_position_ids` también `FOR ALL` sobre `case_table_rows` (puede leer/escribir sus propias filas, no solo leer) — distinto del patrón de solo-lectura usado en preguntas, porque aquí el miembro del caso es quien captura el dato.
- APIs: `api/consultant/case-table-instruments` (CRUD de definiciones, solo consultor), `api/table-rows` (CRUD de filas, sin chequeo de rol en código — RLS decide), `api/table-rows/extract` (IA extrae filas de un documento adjunto según el esquema de columnas del instrumento; devuelve para revisión, no autoguarda — mismo patrón de adjuntos que M4/Brief).
- UI: `/caso/[id]/tablas` (`TablasClient.tsx`) — panel de gestión (solo consultor: crear tabla con builder de columnas tipo texto/número/moneda/porcentaje/selector, asignar puestos) + grid editable genérico (agregar/editar/borrar fila, inputs por tipo de columna) + botón "Subir documento" que llama a `extract`, muestra vista previa, y el usuario confirma antes de insertar cada fila real. Tab "Tablas" agregado a `CasoTabs.tsx` y `DirectorTabs.tsx`.
- **Validado end-to-end en navegador real** (no solo API): como consultor — crear 2 instrumentos con columnas y puestos distintos, llenar fila manual, subir documento de texto plano y CSV con datos ficticios → IA extrajo correctamente 3 filas en ambos casos con el esquema exacto de columnas, confirmar inserción. Como directivo con puesto mapeado — solo ve el instrumento asignado a su puesto (el otro, mapeado a un puesto distinto, queda oculto), agregar fila y llenarla persiste correctamente tras recargar. RLS confirmada por API: puesto no mapeado recibe lista vacía en GET y 403 en POST/insert.
- Cubre del Kit: mapa de clientes/concentración/altas-bajas/servicios (M1), inventario de equipos/servicios no comercializados (M2), rentabilidad por servicio (M4), benchmark de tarifas de competencia (M5), talento/quick wins/riesgos (M6).
- Datos de prueba sembrados durante la validación fueron borrados del caso Famtell después de confirmar que todo funcionaba (para no dejar filas ficticias en el caso real).
