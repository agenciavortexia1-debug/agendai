-- Script de Correção Parte 2
-- Objetivo: Liberar leitura pública completa para as tabelas essenciais para o funcionamento do Staff e Booking público

-- 1. A tabela businesses precisa ser lida tanto pelo link agendai.com/b/[slug] quanto pelo login do staff.
DROP POLICY IF EXISTS "Qualquer um pode ler dados de negócios" ON "Agenda2".businesses;
CREATE POLICY "Qualquer um pode ler dados de negócios"
ON "Agenda2".businesses FOR SELECT
USING (true);

-- 2. Serviços
DROP POLICY IF EXISTS "Qualquer um pode ler serviços" ON "Agenda2".services;
CREATE POLICY "Qualquer um pode ler serviços"
ON "Agenda2".services FOR SELECT
USING (true);

-- 3. Horários de funcionamento
DROP POLICY IF EXISTS "Qualquer um pode ler horas de funcionamento" ON "Agenda2".business_hours;
CREATE POLICY "Qualquer um pode ler horas de funcionamento"
ON "Agenda2".business_hours FOR SELECT
USING (true);

-- 4. Tempos bloqueados
DROP POLICY IF EXISTS "Qualquer um pode ler tempos bloqueados" ON "Agenda2".blocked_times;
CREATE POLICY "Qualquer um pode ler tempos bloqueados"
ON "Agenda2".blocked_times FOR SELECT
USING (true);

-- 5. Profissionais
DROP POLICY IF EXISTS "Qualquer um pode ler perfis de profissionais" ON "Agenda2".professionals;
CREATE POLICY "Qualquer um pode ler perfis de profissionais"
ON "Agenda2".professionals FOR SELECT
USING (true);

-- 6. Serviços dos Profissionais (Relacionamento)
DROP POLICY IF EXISTS "Qualquer um pode ler especialidades" ON "Agenda2".professional_services;
CREATE POLICY "Qualquer um pode ler especialidades"
ON "Agenda2".professional_services FOR SELECT
USING (true);
