-- Correção do erro ao salvar horários de funcionamento (BusinessHours)
-- O Supabase falha em operações UPSERT (Insert + Update) quando a política "FOR ALL" 
-- usa subqueries complexas que dependem de outras tabelas, causando conflito de permissão.

-- 1. Remove qualquer política anterior que esteja bloqueando o UPSERT
DROP POLICY IF EXISTS "RLS_Optimized_BusinessHours_All" ON "Agenda2".business_hours;
DROP POLICY IF EXISTS "RLS_Optimized_BusinessHours_Insert" ON "Agenda2".business_hours;
DROP POLICY IF EXISTS "RLS_Optimized_BusinessHours_Update" ON "Agenda2".business_hours;

-- 2. Cria políticas separadas e seguras para INSERT e UPDATE vinculadas ao dono

-- Política para INSERT: O usuário autenticado deve ser dono do negócio que ele está tentando inserir
CREATE POLICY "RLS_BusinessHours_Insert" ON "Agenda2".business_hours
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Agenda2".businesses 
            WHERE id = business_hours.business_id 
            AND user_id = auth.uid()
        )
    );

-- Política para UPDATE: O usuário autenticado deve ser dono do negócio correspondente
CREATE POLICY "RLS_BusinessHours_Update" ON "Agenda2".business_hours
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "Agenda2".businesses 
            WHERE id = business_hours.business_id 
            AND user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Agenda2".businesses 
            WHERE id = business_hours.business_id 
            AND user_id = auth.uid()
        )
    );

-- 3. Garante que Deletes também funcionem da mesma forma (opcional mas recomendado)
CREATE POLICY "RLS_BusinessHours_Delete" ON "Agenda2".business_hours
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "Agenda2".businesses 
            WHERE id = business_hours.business_id 
            AND user_id = auth.uid()
        )
    );

-- A leitura (SELECT) já está pública através do comando rodado anteriormente, 
-- então não será alterada aqui para não causar conflitos.
