-- ==============================================================================
-- CORREÇÃO DE RLS PARA ACESSO PÚBLICO E COLABORADORES
-- Resolve o erro "Negócio não encontrado" na tela pública
-- Resolve o erro "Usuário ou senha incorretos" no login do colaborador
-- ==============================================================================

-- 1. Liberação de leitura pública na tabela businesses
DROP POLICY IF EXISTS "Leitura pública para negócios ativos" ON "Agenda2".businesses;
DROP POLICY IF EXISTS "RLS_Optimized_Businesses_Select" ON "Agenda2".businesses;
CREATE POLICY "RLS_Optimized_Businesses_Select" ON "Agenda2".businesses
    FOR SELECT USING (true);

-- 2. Liberação de leitura pública na tabela professionals
DROP POLICY IF EXISTS "Leitura publica de profissionais" ON "Agenda2".professionals;
DROP POLICY IF EXISTS "RLS_Optimized_Professionals_Select" ON "Agenda2".professionals;
CREATE POLICY "RLS_Optimized_Professionals_Select" ON "Agenda2".professionals
    FOR SELECT USING (true);

-- 3. Liberação de leitura pública na tabela services
DROP POLICY IF EXISTS "Leitura publica de servicos" ON "Agenda2".services;
DROP POLICY IF EXISTS "RLS_Optimized_Services_Select" ON "Agenda2".services;
CREATE POLICY "RLS_Optimized_Services_Select" ON "Agenda2".services
    FOR SELECT USING (true);

-- 4. Liberação de leitura pública na tabela professional_services
DROP POLICY IF EXISTS "Leitura publica de prof_servicos" ON "Agenda2".professional_services;
DROP POLICY IF EXISTS "RLS_Optimized_ProfServices_Select" ON "Agenda2".professional_services;
CREATE POLICY "RLS_Optimized_ProfServices_Select" ON "Agenda2".professional_services
    FOR SELECT USING (true);

-- 5. Liberação de leitura pública na tabela business_hours
DROP POLICY IF EXISTS "Leitura publica de horarios" ON "Agenda2".business_hours;
DROP POLICY IF EXISTS "RLS_Optimized_BusinessHours_Select" ON "Agenda2".business_hours;
CREATE POLICY "RLS_Optimized_BusinessHours_Select" ON "Agenda2".business_hours
    FOR SELECT USING (true);

-- 6. Liberação de inserção e leitura pública em agendamentos
--    Isso garante que o cliente não logado possa criar agendamentos e ver disponibilidade
DROP POLICY IF EXISTS "Leitura publica update em agendamentos" ON "Agenda2".appointments;
DROP POLICY IF EXISTS "RLS_Optimized_Appointments_Public_Insert" ON "Agenda2".appointments;
CREATE POLICY "RLS_Optimized_Appointments_Public_Insert" ON "Agenda2".appointments
    FOR INSERT WITH CHECK (true);

-- Lembrete: A policy RLS_Optimized_Appointments_Public_Select já existe no schema_agenda2,
-- mas vamos garantir que esteja ok:
DROP POLICY IF EXISTS "RLS_Optimized_Appointments_Public_Select" ON "Agenda2".appointments;
CREATE POLICY "RLS_Optimized_Appointments_Public_Select" ON "Agenda2".appointments
    FOR SELECT USING (true);

-- FIM DA CORREÇÃO
