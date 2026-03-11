-- ==============================================================================
-- SCRIPT COMPLEMENTAR DE CONFIGURAÇÃO: STORAGE, BUCKETS E PERMISSÕES (LOCAL HOST)
-- ==============================================================================

-- 1. Criação do Bucket de Storage (agendai-uploads)
-- Isso armazena logos de empresas, avatares de profissionais e imagens de referência de clientes
INSERT INTO storage.buckets (id, name, public)
VALUES ('agendai-uploads', 'agendai-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 2. POLÍTICAS DE SEGURANÇA (RLS) PARA O STORAGE
-- Permitir que as imagens sejam lidas publicamente, mas apenas usuários autenticados possam enviar/deletar
-- ==============================================================================

-- Leitura pública de qualquer arquivo no bucket
CREATE POLICY "Leitura pública de imagens" ON storage.objects
    FOR SELECT USING (bucket_id = 'agendai-uploads');

-- Inserção de arquivos (qualquer usuário logado pode subir imagens para o bucket)
CREATE POLICY "Upload autenticado" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'agendai-uploads' AND auth.role() = 'authenticated'
    );

-- Atualização de arquivos (somente quem fez o upload pode alterar)
CREATE POLICY "Atualização pelo dono do arquivo" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'agendai-uploads' AND auth.uid() = owner
    );

-- Deleção de arquivos (somente quem fez o upload pode deletar)
CREATE POLICY "Deleção pelo dono do arquivo" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'agendai-uploads' AND auth.uid() = owner
    );


-- ==============================================================================
-- 3. PERMISSÕES BÁSICAS DO SCHEMA AUTH (GARANTIA PARA SELF-HOST / LOCAL HOST)
-- ==============================================================================
-- Como é localhost, garantimos que as roles 'anon' e 'authenticated' tenham uso do schema auth
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT SELECT ON auth.users TO anon, authenticated;

-- Garantimos uso do schema public e das funções básicas
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- ==============================================================================
-- 4. CRIAÇÃO DE TRIGGERS ÚTEIS DE AUTENTICAÇÃO
-- ==============================================================================
-- Opcional: Trigger para atualizar 'updated_at' nas tabelas que possuem essa coluna

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
