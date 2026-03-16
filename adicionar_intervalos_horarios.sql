-- Adiciona colunas de intervalo (almoço) na tabela de horários de funcionamento
-- Isso resolve o erro "Erro ao salvar horários" causado por colunas inexistentes

ALTER TABLE "Agenda2".business_hours 
ADD COLUMN IF NOT EXISTS has_break BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS break_start TIME,
ADD COLUMN IF NOT EXISTS break_end TIME;
