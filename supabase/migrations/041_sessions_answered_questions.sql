-- Contador real de preguntas del guion cubiertas en una sesión de entrevista.
-- Se alimenta del tag oculto [QUESTION_ADVANCE] que Nova emite al terminar
-- una pregunta del guion y pasar a la siguiente — reemplaza la aproximación
-- anterior (contar mensajes de usuario), que trataba cada pregunta de
-- profundización o archivo adjunto como si fuera una pregunta nueva del guion.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS answered_questions INTEGER NOT NULL DEFAULT 0;
