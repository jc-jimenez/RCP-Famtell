-- Guardar el password del registro pendiente para poder crear la cuenta
-- en cuanto AMBAS verificaciones (WhatsApp + email) estén completas,
-- sin importar en qué orden las complete el usuario.
-- Se borra junto con el registro pendiente al activar la cuenta.
ALTER TABLE pending_registrations
  ADD COLUMN IF NOT EXISTS password TEXT;
