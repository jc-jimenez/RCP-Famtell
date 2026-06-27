-- Agregar campo whatsapp_phone a case_users para notificaciones vía WhatsApp
alter table case_users
  add column if not exists whatsapp_phone text;
