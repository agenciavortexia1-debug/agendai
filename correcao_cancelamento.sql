-- Corrige o cancelamento de agendamentos pelos clientes (ClientPortal)
-- O cliente não está logado via Supabase, portanto a policy UPDATE USING (true) não basta:
-- ela precisa de WITH CHECK (true) para permitir a mudança de conteúdo.

-- Remove policies antigas e recria com a permissão completa:
DROP POLICY IF EXISTS "Leitura publica update em agendamentos" ON "Agenda2".appointments;
DROP POLICY IF EXISTS "Permitir update publico de agendamentos" ON "Agenda2".appointments;

CREATE POLICY "Permitir update publico de agendamentos" ON "Agenda2".appointments
    FOR UPDATE
    USING (true)
    WITH CHECK (true);
