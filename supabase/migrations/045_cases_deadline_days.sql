-- Plazo estándar (en días desde la invitación de cada participante) que usa
-- el semáforo de ritmo de la matriz de Avance del super-admin. Antes era una
-- constante fija en código (7 días) — se hace configurable por caso porque
-- no todos los casos usan el mismo plazo real acordado con el cliente.

alter table cases
  add column if not exists diagnostic_deadline_days integer not null default 7;
