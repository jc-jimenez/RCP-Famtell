-- Permite invitaciones pendientes sin usuario asignado todavía.
-- user_id era NOT NULL con FK a auth.users, así que el placeholder
-- '00000000-...' violaba la FK y rompía toda invitación.
-- Ahora es NULL hasta que el invitado activa su cuenta.

ALTER TABLE case_users ALTER COLUMN user_id DROP NOT NULL;
