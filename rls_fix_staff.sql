-- Arquivo: rls_fix_staff.sql
-- Essa query libera a leitura das tabelas para acesso publico / deslogado
-- Isso é necessário porque o "Colaborador" (Employee) entra via sistema de login customizado (login_user/pass)
-- e o seu supabase client funciona como "anon" aos olhos do Row Level Security.

-- 1. Liberação na tabela businesses
DROP POLICY IF EXISTS "Leitura pública para negócios ativos" ON businesses;
CREATE POLICY "Leitura pública para negócios ativos" ON businesses
  FOR SELECT USING (true);

-- 2. Liberação na tabela appointments (Leitura e Inserção para público/funcionários via app cliente)
DROP POLICY IF EXISTS "Acesso aos agendamentos (Owner e Colaborador)" ON appointments;
DROP POLICY IF EXISTS "Permitir leitura pública temporária" ON appointments;
CREATE POLICY "Permitir leitura pública na agenda para exibição e login custom" ON appointments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir criacao publica de agendamentos" ON appointments;
CREATE POLICY "Permitir criacao publica de agendamentos" ON appointments
  FOR INSERT WITH CHECK (true);

-- 3. Atualizar também as de profissionais e serviços para o public booking e login
DROP POLICY IF EXISTS "Leitura publica de profissionais" ON professionals;
CREATE POLICY "Leitura publica de profissionais" ON professionals
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Leitura publica de servicos" ON services;
CREATE POLICY "Leitura publica de servicos" ON services
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Leitura publica de prof_servicos" ON professional_services;
CREATE POLICY "Leitura publica de prof_servicos" ON professional_services
  FOR SELECT USING (true);

-- Notificações 
DROP POLICY IF EXISTS "Leitura publica update em agendamentos" ON appointments;
CREATE POLICY "Leitura publica update em agendamentos" ON appointments
  FOR UPDATE USING (true);
